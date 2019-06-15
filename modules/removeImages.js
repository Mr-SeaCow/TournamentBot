const child_process = require('child_process');
child_process.exec('myscript.bat', function(error, stdout) {
    console.log(stdout);
});

module.exports = () => {
    child_process.exec('myscript.bat', function(error, stdout,) {
        console.log(stdout);
    });    
}