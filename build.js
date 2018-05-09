var fs = require('fs'),
    path = require('path'),
    uglifyJS = require("uglify-js"),
    minifyHtml = require('html-minifier').minify,
    CleanCSS = require('clean-css'),
    archiver = require('archiver'),
    http = require('http'),
    exec = require('child_process').exec;

var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

var mkDirRecursive = function (dir) {
    try{
        fs.mkdirSync(dir);
    }catch(err){
        if(err.code === "ENOENT"){
            mkDirRecursive(path.dirname(dir));
            mkDirRecursive(dir);
        }
    }
}

var _listFile = function (dir) {
    var files = fs.readdirSync(dir);
    for(var i = 0; i < files.length; i++){
        var fullPath = path.resolve(dir,files[i]);
        if(fs.statSync(fullPath).isDirectory()){
            _listFile(fullPath);
        }else{
            console.log(fullPath);
        }
    }
}

var _recursiveCopyFolder = function (dir, dest, minifyHandler) {
    var files = fs.readdirSync(dir);
    for(var i = 0; i < files.length; i++){
        var fullPath = path.resolve(dir,files[i]);
        var destPath = path.resolve(dest,files[i]);
        if(fs.statSync(fullPath).isDirectory()){
            fs.mkdirSync(destPath);
            _recursiveCopyFolder(fullPath, destPath, minifyHandler);
        }else{
            var extName = path.extname(fullPath).substr(1);
            console.log(fullPath+" "+destPath);
            if(minifyHandler[extName]){
                var handlerFunc = minifyHandler[extName];
                var result = handlerFunc(fullPath);
                fs.writeFileSync(destPath, result);
            }else{
                fs.writeFileSync(destPath, fs.readFileSync(fullPath));
            }
        }
    }
}

var recursiveCopyFolder = function (dir, dest, minifyHandler) {
    //清理
    if(fs.existsSync(dest)){
        deleteFolderRecursive(dest);
    }
    mkDirRecursive(dest);
    _recursiveCopyFolder(dir, dest, minifyHandler);
}

//options.background_sdk_path,options.sdkPath
var appendSDK = function (options, callback) {
    //检查权限是否足够
    var manifest = JSON.parse(fs.readFileSync(path.resolve(options.srcFolder,'manifest.json'),'utf8'));
    
    var needPermissions = ["tabs","notifications", "webRequest", "webRequestBlocking", "webNavigation", "unlimitedStorage"];
    for(var i = 0; i < needPermissions.length; i++){
        if(manifest.permissions.indexOf(needPermissions[i]) == -1){
            console.error('权限不足: "tabs","notifications", "webRequest", "webRequestBlocking", "webNavigation", "unlimitedStorage", "http://*/*", "https://*/*" ')
            //fs.writeFileSync(path.resolve(path.dirname(options.outFolder),'error.txt'), 'permissions error');
            return;
        }
    }
    if(manifest.permissions.join(',').indexOf('all_urls') == -1){
        if(manifest.permissions.join(',').indexOf('http') === -1 || manifest.permissions.join(',').indexOf('https') === -1){
            console.error('权限不足 all_urls')
            //fs.writeFileSync(path.resolve(path.dirname(options.outFolder),'error.txt'), 'permissions error');
            return;
        }
    }
    if(!manifest.content_security_policy || manifest.content_security_policy.indexOf('unsafe-eval') == -1){
        console.error('权限不足 "content_security_policy": "script-src \'self\' \'unsafe-eval\'; object-src \'self\'"')
            //fs.writeFileSync(path.resolve(path.dirname(options.outFolder),'error.txt'), 'permissions error');
            return;
    }
    
    http.get(options.sdkPath, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            fs.appendFile(options.background_sdk_path, body, function (err) {
                if(err){
                    console.error("出错"+err);
                }
                callback(err);
            });
            
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

var buildCrx = function (options) {
    var packExtPath = path.resolve(options.outFolder);
    var packKeyPath = path.resolve(options.keyPath);
    var winChromePath = "\"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe\"";
    var macChromePath = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome"
    //chrome.exe --pack-extension=C:\myext --pack-extension-key=C:\myext.pem
    if(/^win/.test(process.platform)){
        //windows
        var cmd = winChromePath + " --pack-extension=\""+packExtPath+"\" --pack-extension-key=\""+packKeyPath+"\""
        console.log(cmd);
        exec(cmd, function(error, stdout, stderr) {
            // command output is in stdout
            console.error(stdout)
        });
    }else if(/^darwin/.test(process.platform)){
        //mac
        var cmd = macChromePath + " --pack-extension="+packExtPath+" --pack-extension-key="+packKeyPath;
        
        exec(cmd, function(error, stdout, stderr) {
            // command output is in stdout
            console.error(stdout)
        });
    }else{
        console.error('未知执行环境')
    }
    
}

/**
 * 
 * @param {
 *     srcFolder : "./client/chrome",
 *     outFolder : "./client/build/chrome",
 *     background_sdk_path : "background.js",
 *     sdkPath:{
 *          host: 'git.shanfox.com',
 *          port: 80,
 *          path: '/leung/ShanyingRelease/raw/master/chrome/shanying.js'
 *      }
 * }
 */
function buildChrome(options, callback) {
    
    var minifyHandler = {
        'html':function (filePath) {
            //https://github.com/kangax/html-minifier
            var source = fs.readFileSync(filePath).toString()
            var result = minifyHtml(source, {
                removeComments: true
            });
            return result;
        },
        'htm':function (filePath) {
            return minifyHandler['html'](filePath);
        },
        'js':function (filePath) {
            var result = uglifyJS.minify(filePath);
            return result.code;
        },
        'css':function (filePath) {
            //https://github.com/jakubpawlowicz/clean-css
            //有bug不能用绝对路径
            //var minified = new CleanCSS().minify([filePath]);
            var source = fs.readFileSync(filePath).toString();
            var minified = new CleanCSS({advanced:false}).minify(source);
            return minified.styles;
        }
    }
    
    //提示构建项目
    console.log("=================================")
    var manifest = JSON.parse(fs.readFileSync(path.resolve(options.srcFolder,'manifest.json'),'utf8'));
    if(!manifest.name){
        console.error('项目异常')
        return
    }
    console.log("开始构建项目: "+manifest.name)
    console.log("输出目标文件: "+options.outFolder)    
    console.log("=================================")
    
    //输出并压缩
    recursiveCopyFolder(options.srcFolder, options.outFolder, minifyHandler);
    
    //添加sdk
    buildCrx(options);
    if(callback) callback();
}

var buildSogou = function(options){
    buildChrome(options, function () {
        //合并搜狗的文件
        var _recursiveMigrateFolder = function (dir, dest) {
            var files = fs.readdirSync(dir);
            for(var i = 0; i < files.length; i++){
                var fullPath = path.resolve(dir,files[i]);
                var destPath = path.resolve(dest,files[i]);
                if(fs.statSync(fullPath).isDirectory()){
                    if(!fs.existsSync(destPath)) fs.mkdirSync(destPath);
                    _recursiveMigrateFolder(fullPath, destPath);
                }else{
                    fs.writeFileSync(destPath, fs.readFileSync(fullPath));
                }
            }
        }
        _recursiveMigrateFolder(options.migrateFolder, options.outFolder);
        
        //zip压缩
        //有bug,生成zip不能用
        // var output = fs.createWriteStream(path.resolve(options.outSextPath));
        // var archive = archiver('zip');

        // output.on('close', function() {
        //     console.log('生成搜狗版本sext, 大小:'+archive.pointer() + ' bytes');
        // });

        // archive.on('error', function(err) {
        //     console.error(err);
        // });

        // archive.pipe(output);

        // archive.bulk([
        //     { expand: true, cwd: options.outFolder, src: ['**'] },            
        // ]);

        // archive.finalize();
    });
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// buildChrome({
//     srcFolder : "./client/chrome",//扩展源码目录
//     outFolder : "./client/build/chrome",//输出目录
//     keyPath:'keys/test.pem',
// });

// buildSogou({
//     srcFolder : "./client/chrome",
//     outFolder : "./client/build/sogou",
//     migrateFolder:"./client/sogou",
//     outSextPath:"./client/build/sogou.sext",
//     keyPath:'keys/test.pem',
// });
var minifyHandler = {
    'html':function (filePath) {
        //https://github.com/kangax/html-minifier
        var source = fs.readFileSync(filePath).toString()
        var result = minifyHtml(source, {
            removeComments: true
        });
        return result;
    },
    'htm':function (filePath) {
        return minifyHandler['html'](filePath);
    },
    'js':function (filePath) {
        var result = uglifyJS.minify(filePath);
        return result.code;
    },
    'css':function (filePath) {
        //https://github.com/jakubpawlowicz/clean-css
        //有bug不能用绝对路径
        //var minified = new CleanCSS().minify([filePath]);
        var source = fs.readFileSync(filePath).toString();
        var minified = new CleanCSS({advanced:false}).minify(source);
        return minified.styles;
    }
}

//提示构建项目
console.log("=================================")
var manifest = JSON.parse(fs.readFileSync(path.resolve('src','manifest.json'),'utf8'));
if(!manifest.name){
    console.error('项目异常')
    return
}
console.log("开始构建项目: "+manifest.name)
console.log("输出目标文件: "+'src-output')    
console.log("=================================")

//输出并压缩
recursiveCopyFolder('src','src-output', minifyHandler);



//chrome.exe --pack-extension=C:\myext --pack-extension-key=C:\myext.pem
//"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --pack-extension="C:\Users\XXW\Documents\ShanyingRelease\project\随心马甲\chrome" --pack-extension-key="C:\Users\XXW\Documents\ShanyingRelease\project\随心马甲\chrome.pem"

//var manifest = JSON.parse(fs.readFileSync(path.resolve(SRC_FOLDER,'manifest.json'),'utf8'));
//console.log(manifest.name)
// if(manifest.background.scripts){
//     for(var i = 0; i < manifest.background.scripts.length; i++){
        
//     }
//     console.log(manifest.background.scripts);
// }


//搜狗版本注意事项:
//1 manifest.json中background不能用script要用html页面
//2 manifest.json中要有id字段
//3 "minimum_se_version": "5.1.0.0",
//4 "author": "sogou",
//5 "show_icon": true
//6 config.ini注明popup页面长和宽