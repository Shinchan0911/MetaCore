const chalk = require('chalk');

module.exports = (str, end) => {
	console.log(chalk.hex('#00FFCC').bold(`${end || '[ MetaCord ]'} • `) + str);
};