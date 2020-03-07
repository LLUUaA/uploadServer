const HTTP = require('http');
const HTTPS = require('https');
const iconv = require('iconv-lite');

module.exports = function (opts, isHttps = false) {
    return new Promise((resolve, reject) => {
        const reqHttp = isHttps ? HTTPS : HTTP;

        const postData = JSON.stringify(opts.data || {});

        var options = Object.assign({
            hostname: "",
            method: 'GET',
            path: opts.path || opts.url,
            port: null,
            headers: {
                "Content-Type": 'application/json',
                "Content-Length": postData.length
            },
            agent: false
        }, opts)

        // console.log('options',options);
        const req = reqHttp.request(options, (res) => {
            // console.log('状态码：', res.statusCode);
            // console.log('请求头：', res.headers);
            var datas = [];
            var size = 0;

            res.on('data', (data) => {
                datas.push(data);
                size += data.length;



            })
            res.on("end", function () {
                var buff = Buffer.concat(datas, size);
                var result = iconv.decode(buff, "utf8"); //转码//var result = buff.toString();//不需要转编码
                try {
                   const rJson = JSON.parse(result);
                   resolve(rJson);
                } catch (error) {
                    resolve(result);
                } 
            })
        });

        req.on('error', (e) => {
            req.destroy();
        });

        req.write(postData);
        req.end();
    })
}