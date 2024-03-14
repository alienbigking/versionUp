import { program } from 'commander';
import inquirer from 'inquirer'; // 交互式命令行
import chalk from 'chalk';
import _ from 'lodash';
import { packageJson } from "../utils/index.js";
import selectLine from 'inquirer-select-line';
import fs from 'fs'; // 导入文件系统模块

// 导入依赖并注册prompt
inquirer.registerPrompt('selectLine', selectLine);
const { cloneDeep } = _;

// 解析命令行参数
program.usage('根据当前本地项目的版本号，自动生成可选的版本号');
program.option('-n, --number <number>', '要生成的版本号数量', 10);
program.option('-e, --exclude <type>', '要排除的版本号类型', 'beta');
program.parse(process.argv);
const options = program.opts();

// 主函数
const init = () => {
    const version = packageJson.version;

    // 如果存在版本号，则提示用户选择是否手动输入版本号
    if (version) {
        inquirer.prompt([
            {
                type: 'list',
                message: '请选择要升级或降级的版本号来源：',
                name: 'versionSource',
                choices: ['手动输入', '生成版本号']
            }
        ]).then(({ versionSource }) => {
            if (versionSource === '手动输入') {
                manualInput();
            } else {
                generateVersion();
            }
        });
    } else {
        console.log(chalk.red('未检测到项目的版本号，请检查版本号是否有误。'));
        generateVersion(); // 当没有手动输入版本号时调用 generateVersion 函数
    }
};

// 手动输入版本号
const manualInput = () => {
    inquirer.prompt([
        {
            type: 'input',
            message: '请输入要升级或降级的版本号：',
            name: 'selectedVersion',
            validate: input => isValidVersion(input) ? true : '请输入有效的版本号（例如：1.2.3或1.0.6-beta.2）'
        }
    ]).then(({ selectedVersion }) => {
        console.log('你选择的版本号是：', selectedVersion);
        // 接下来可以对所选版本号执行需要的操作
        updatePackageJson(selectedVersion);
    });
};

// 生成对应的推介版本
const generateVersion = () => {
    const version = packageJson.version;

    // 如果存在版本号，则生成对应的推介版本
    if (version) {
        const choices = buildVersion(version, options.number, options.exclude);
        const questions = [
            {
                type: 'selectLine',
                message: '请选择要升级或降级的版本号',
                placeholder: '选中之后将自动填写为所选的版本号',
                name: 'index',
                choices
            },
        ];
        inquirer.prompt(questions, {}).then(({ index }) => {
            const selectedVersion = choices[index];
            console.log('当前已选择自动推荐的版本号：', selectedVersion);
            updatePackageJson(selectedVersion);
        });
    } else {
        console.log(chalk.red(`\n 检测到项目的版本号不符合规则“${packageJson.version}”，请检查版本号是否有误！\n `));
    }
};

// 更新 package.json 文件中的版本号
const updatePackageJson = (newVersion) => {
    packageJson.version = newVersion;
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
    console.log('已更新 package.json 中的版本号为：', newVersion);
};

// 验证版本号是否符合预期格式
const isValidVersion = version => /^\d+(\.\d+)*(-\w+(\.\d+)?)?$/.test(version);



// 构建版本号数组
const buildVersion = (version, number, exclude) => {
    let arr = version.split('.');
    const majorResult = [];
    const minorResult = [];
    const revisionResult = [];
    const betaResult = [];

    // 提取主版本号、次版本号、修订版本号
    let majorVersionNumber = Number(arr[0]);
    let minorVersionNumber = Number(arr[1]);
    let revisionVersionNumber = Number(
        arr[2].indexOf('beta') !== -1 ? arr[2].split('-')[0] : arr[2]
    );
    let betaNumber = cloneDeep(arr).pop() || 0;

    // 版本号前三位
    const mainVersion = {
        majorVersionNumber,
        minorVersionNumber,
        revisionVersionNumber,
    };
    const minorVersionCount = number / 2; // 次版本数量
    const revisionVersionCount = number / 2; // 修订版本数量
    const betaVersionCount = number; // beta版本数量

    // beta版本号
    let betaForwardNumber = betaNumber;
    let betaBackwardNumber = betaNumber;

    // 生成beta版本号
    if (exclude !== 'beta') {
        handleBetaVersionCount(betaVersionCount, betaForwardNumber, betaBackwardNumber, betaResult);
    }

    // 生成次版本号
    handleMinorVersionCount(minorVersionCount, mainVersion, minorResult);

    // 生成修订版本号
    handleRevisionVersionCount(revisionVersionCount, mainVersion, revisionResult);

    // 合并所有版本号数组
    const betaData = handleBeta(arr, betaResult);
    const majorData = handleMajor(arr, majorResult, majorVersionNumber);
    const minorData = handleMinor(arr, minorResult, minorVersionNumber);
    const revisionData = handleRevision(arr, revisionResult, revisionVersionNumber);

    return [...majorData, ...betaData, ...revisionData, ...minorData];
};

// 生成beta版本号数组
const handleBetaVersionCount = (betaVersionCount, betaForwardNumber, betaBackwardNumber, betaResult) => {
    for (let i = 0; i < betaVersionCount; i++) {
        if (i < 4 && betaForwardNumber > 0) {
            --betaForwardNumber;
            betaResult.push(betaForwardNumber);
        }
        if (i >= 4) {
            ++betaBackwardNumber;
            betaResult.push(betaBackwardNumber);
        }
    }
};

// 生成次版本号数组
const handleMinorVersionCount = (minorVersionCount, mainVersion, minorResult) => {
    for (let i = 0; i < minorVersionCount; i++) {
        if (mainVersion.minorVersionNumber < 100) {
            mainVersion.minorVersionNumber = ++mainVersion.minorVersionNumber;
        } else if (mainVersion.minorVersionNumber === 100) {
            mainVersion.majorVersionNumber = ++mainVersion.majorVersionNumber;
            mainVersion.minorVersionNumber = 0;
        }
        minorResult.push(mainVersion.minorVersionNumber);
    }
};

// 生成修订版本号数组
const handleRevisionVersionCount = (revisionVersionCount, mainVersion, revisionResult) => {
    for (let i = 0; i < revisionVersionCount; i++) {
        if (mainVersion.revisionVersionNumber < 100) {
            mainVersion.revisionVersionNumber = ++mainVersion.revisionVersionNumber;
        } else if (mainVersion.revisionVersionNumber === 100) {
            mainVersion.minorVersionNumber = ++mainVersion.minorVersionNumber;
            mainVersion.revisionVersionNumber = 0;
        }
        revisionResult.push(mainVersion.revisionVersionNumber);
    }
};

// 生成beta版本号数组
const handleBeta = (arr, betaResult) => {
    const betaArr = cloneDeep(arr);
    return betaResult.map((value) => {
        if (String(arr[2]).indexOf('beta') !== -1) {
            betaArr.splice(betaArr.length - 1, 1, value);
        } else {
            betaArr.splice(betaArr.length - 1, 1, arr[arr.length - 1] + '-beta.' + value);
        }
        return betaArr.join('.');
    });
};

// 生成主版本号数组
const handleMajor = (arr, majorResult, majorVersionNumber) => {
    const majorArr = cloneDeep(arr).slice(0, -1);
    return majorResult.filter((value) => value !== majorVersionNumber).map((value) => {
        majorArr.splice(0, 1, value);
        return majorArr.join('.');
    });
};

// 生成次版本号数组
const handleMinor = (arr, minorResult, minorVersionNumber) => {
    let minorArr = cloneDeep(arr).slice(0, -1);

    // 如果版本号不包含三个数字，则在末尾补充0
    while (minorArr.length < 3) {
        minorArr.push(0);
    }

    // 确保 minorArr 是一个数组
    if (!Array.isArray(minorArr)) {
        minorArr = [minorArr];
    }

    // 如果版本号包含 beta，则将 beta 替换为 0
    if (minorArr[2] && minorArr[2].indexOf('beta') !== -1) {
        minorArr.splice(2, 1, '0');
    }
    return minorResult.filter((value) => value !== minorVersionNumber).map((value) => {
        minorArr.splice(1, 1, value);
        return minorArr.join('.');
    });
};



// 生成修订版本号数组
const handleRevision = (arr, revisionResult, revisionVersionNumber) => {
    const revisionArr = cloneDeep(arr).slice(0, -1);

    // 如果版本号不包含三个数字，则在末尾补充0
    while (revisionArr.length < 3) {
        revisionArr.push(0);
    }

    return revisionResult.filter((value) => value !== revisionVersionNumber).map((value) => {
        revisionArr.splice(2, 1, value);
        return revisionArr.join('.');
    });
};

// 调用主函数
init();
