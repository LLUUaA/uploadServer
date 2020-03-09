const Koa = require('koa');
const app = new Koa();
const Router = require('koa-router');
const router = new Router();
const koaBody = require('koa-body');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const request = require("./request");
const saveDir = path.join(__dirname, 'uploads/');

console.log("UPLOAD NODE_ENV", process.env.NODE_ENV);

const NODE_ENV = process.env.NODE_ENV || "production"; // env
if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir);
}
const allowCrossList = [
    'chat.bubaocloud.xin',
];

function canCross(url) {
    if (NODE_ENV === "production") {
        const {host} = new URL(url);
        for (const item of allowCrossList) {
            if (item === host) {
                return true;
            }
        }
    } else {
        return true;
    }
    return false;
}
// set Access-Control middleware
app.use(async (ctx, next) => {
    await next();
    // orgin 来自哪里
    // host 当前访问host
    if (ctx.request.path === "/upload" && !canCross(ctx.headers.origin)) {
        ctx.throw("Host Error");
        return;
    }
    ctx.set('Access-Control-Allow-Origin', "*");
    ctx.set('Access-Control-Allow-Headers', '*');
    ctx.set('Access-Control-Allow-Methods', 'POST, GET', 'OPTIONS');
})

// response middleware
app.use(async (ctx, next) => {
    try {
        await next();
        ctx.body = ctx.body || {
            code: 0,
            message: "your ip is:" + ctx.request.header['x-real-ip'],
        }
    } catch (e) {
        // catch 住全局的错误信息
        console.log("error", e);
        let [errorType, code, errMsg] = (e.message || "").split(',');
        if (errorType === "Error" && code) {
            code = Number(code) || -1;
            errMsg = errMsg;
            ctx.status = 500;
        } else {
            code = -1;
            errMsg = e.message || "server error";
        }
        ctx.status = ctx.status || 500;
        ctx.body = {
            code: code,
            error: errMsg,
        }
    }
});

// auth middleware
app.use(async (ctx, next) => {
    if (ctx.request.path !== "/upload") {
        return await next();
    }
    const method = ctx.request.method.toUpperCase();
    const authorization = ctx.request.header.authorization;
    if (method === 'OPTIONS') {
        return await next();
    }
    if (!authorization) {
        ctx.throw("Auth Error");
    }
    const resp = await request({
        hostname: "127.0.0.1",
        port: 3003,
        url: '/account/checkSession',
        headers: ctx.request.headers
    });
    if (resp.code !== 200) {
        ctx.status = 401;
        ctx.throw("Auth Error");
    }
    await next();
})

/**
 * 
 * @param {string} fileName 
 * @param {boolean} dot 
 */
function getExt(fileName, dot) {
    try {
        const nameArr = fileName.split('.');
        if (nameArr.length > 1) {
            return `${dot === true ? '.':''}${nameArr[nameArr.length - 1]}` || '';
        } else {
            throw new EvalError();
        }

    } catch (error) {
        return '';
    }
}

app.use(koaBody({
    multipart: true,
    formidable: {
        maxFileSize: 5 * 1024 * 1024, // 设置上传文件大小最大限制(5M)，默认2M
        uploadDir: saveDir,
        hash: 'sha1',
        keepExtensions: true,
        onFileBegin: function (name, file) {
            file.path = `${saveDir}/${crypto.randomBytes(32).toString('hex')}${getExt(file.name, true)}`;
        },
    },

    onError: function (err) {
        throw new Error(["Error", 500, err]);
    }
}));

router.post('/upload', async (ctx) => {
    const matchkey = 'uploads\\/';
    const filePath = ctx.request.files.file.path;
    const i = filePath.indexOf(matchkey);
    const fileName = filePath.substr(i + matchkey.length);
    ctx.body = {
        status: 200,
        fileUrl: `${ctx.headers.host}/static/${fileName}`
    };
});

router.get("/static/:fileName", (ctx) => {
    const {
        fileName
    } = ctx.params;
    try {
        ctx.set("content-type", `image/${getExt(fileName)}`);
        const file = fs.readFileSync(`${saveDir}\\${fileName}`);
        ctx.status = 200;
        ctx.body = file;
    } catch (error) {
        ctx.status = 204;
    }
});


app.use(router.routes());
app.listen(3002);