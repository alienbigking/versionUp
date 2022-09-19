#! /usr/bin/env node

'use strict'

import {program} from 'commander'
import inquirer from 'inquirer' // 交互式命令行
import ora from 'ora'
import chalk from 'chalk'
import download from 'download-git-repo'
import _ from 'lodash'
import {packageJson} from "../utils/index.js"
import selectLine from 'inquirer-select-line'

inquirer.registerPrompt('selectLine', selectLine)
const {cloneDeep} = _

program.usage('根据当前本地项目的版本号，自动生成可选的版本号')
program.parse(process.argv)

init()

function init() {
    // 判断是否有参数
    // if (program.args.length < 1) {
    //     return program.help()
    // }
    generateVersion()
}

// 生成对应的推介版本
function generateVersion() {
// 生成10个推荐的版本号
    const version = packageJson.version

    if (version) { // 正式版本号 official // beta测试版本
        const choices = buildVersion(version)
        const questions = [
            {
                type: 'selectLine',
                message: '请选择要升级或降级的版本号',
                placeholder: '选中之后将自动填写为所选的版本号',
                name: 'index',
                choices: choices,
            }
        ]
        inquirer.prompt(questions, {}).then((answers) => {
            return new Promise((resolve) => {
                const {name, url} = answers
                console.log('当前结果', answers)
            })
        })
    } else {
        console.log(chalk.red(`\n 检测到项目的版本号不符合规则“${packageJson.version}”，请检查版本号是否有误！\n `))
    }
}

// 构建出版本    在当前版本上生成向前5个，向后5个相邻版本号,总共12个版本
function buildVersion(version) {
    let arr = version.split('.')
    const majorResult = []
    const minorResult = []
    const revisionResult = []
    const betaResult = []

    let majorVersionNumber = Number(arr[0]) // 主版本号
    let minorVersionNumber = Number(arr[1]) // 次版本号
    let revisionVersionNumber = Number(arr[2].indexOf('beta') !== -1 ? arr[2].split('-')[0] : arr[2]) // 修订版本号
    let betaNumber = cloneDeep(arr).pop() || 0
    // 版本号前三位
    const mainVersion = {
        majorVersionNumber,
        minorVersionNumber,
        revisionVersionNumber
    }
    const minorVersionCount = 4 // 次版本数量
    const revisionVersionCount = 4 // 修订版本数量
    const betaVersionCount = 8 // beta版本数量

    // beta后面的版本号数字
    let betaForwardNumber = betaNumber
    let betaBackwardNumber = betaNumber

    if (version) {
        // 如果是beta版本,beta不限制版本号长度
        handleBetaVersionCount(betaVersionCount, betaForwardNumber, betaBackwardNumber, betaResult)

        // 次版本号数量
        handleMinorVersionCount(minorVersionCount, mainVersion, minorResult)

        // 修订版本号数量
        handleRevisionVersionCount(revisionVersionCount, mainVersion, revisionResult)

        const betaData = handleBeta(arr, betaResult)
        // 第一位版本号数字(主版本号)
        const majorData = handleMajor(arr, majorResult, majorVersionNumber)
        // 第二位版本号数字(次版本号)
        const minorData = handleMinor(arr, minorResult, minorVersionNumber)
        // 第三位版本号数字(修订版本号)
        const revisionData = handleRevision(arr, revisionResult, revisionVersionNumber)
        console.log('最终合成的数组', [majorData, betaData, revisionData, minorData])
        return [...majorData, ...betaData, ...revisionData, ...minorData]
    }
}


// beta版本数量
function handleBetaVersionCount(betaVersionCount, betaForwardNumber, betaBackwardNumber, betaResult) {
    for (let i = 0; i < betaVersionCount; i++) {
        // 向前生成的数量  优先生成beta版本号数量
        if (i < 4 && betaForwardNumber > 0) {
            --betaForwardNumber
            betaResult.push(betaForwardNumber)
        }
        // 向后生成的数量
        if (i >= 4) {
            ++betaBackwardNumber
            betaResult.push(betaBackwardNumber)
        }
    }
    console.log('空数组1', betaResult)
}

// 次版本数量
function handleMinorVersionCount(minorVersionCount, mainVersion, minorResult) {
    for (let i = 0; i < minorVersionCount; i++) {
        // handleMainVersionNumber(mainVersion)
        if (mainVersion.minorVersionNumber < 100) { // 次版本号最大到100
            mainVersion.minorVersionNumber = ++mainVersion.minorVersionNumber
        } else if (mainVersion.minorVersionNumber === 100) { // 次版本到达100后，向大一级版本加1
            mainVersion.majorVersionNumber = ++mainVersion.majorVersionNumber
            mainVersion.minorVersionNumber = 0
        }
        minorResult.push(mainVersion.minorVersionNumber)
    }
}

// 修订版本数量
function handleRevisionVersionCount(revisionVersionCount, mainVersion, revisionResult) {
    for (let i = 0; i < revisionVersionCount; i++) {
        if (mainVersion.revisionVersionNumber < 100) { // 修订版本号最大到100
            mainVersion.revisionVersionNumber = ++mainVersion.revisionVersionNumber
        } else if (mainVersion.revisionVersionNumber === 100) { // 修订版本到达100后，向大一级版本加1
            mainVersion.minorVersionNumber = ++mainVersion.minorVersionNumber
            mainVersion.revisionVersionNumber = 0
        }
        revisionResult.push(mainVersion.revisionVersionNumber)
    }
}

function handleBeta(arr, betaResult) {
    const betaArr = cloneDeep(arr)
    const data = betaResult.map((value) => {
        // 判断有没有beta
        if (String(arr[2]).indexOf('beta') !== -1) { //无beta
            betaArr.splice(betaArr.length - 1, 1, value)
        } else {
            betaArr.splice(betaArr.length - 1, 1, arr[arr.length - 1] + '-beta.' + value)
        }
        return betaArr.join('.')
    })
    return data
}

function handleMajor(arr, majorResult, majorVersionNumber) {
    const majorArr = cloneDeep(arr).slice(0, -1)
    const data = majorResult.filter(value => value !== majorVersionNumber).map((value) => {
        majorArr.splice(0, 1, value)
        return majorArr.join('.')
    })
    return data
}

function handleMinor(arr, minorResult, minorVersionNumber) {
    const minorArr = cloneDeep(arr).slice(0, -1)
    console.log('minorResult数组', minorArr, minorResult)
    if (minorArr[2].indexOf('beta') !== -1) { //存在beat的情况
        minorArr.splice(2, 1, '0')
    }
    const data = minorResult.filter(value => value !== minorVersionNumber).map((value) => {
        minorArr.splice(1, 1, value)
        return minorArr.join('.')
    })
    return data
}

function handleRevision(arr, revisionResult, revisionVersionNumber) {
    const revisionArr = cloneDeep(arr).slice(0, -1)
    const data = revisionResult.filter(value => value !== revisionVersionNumber).map((value) => {
        revisionArr.splice(2, 1, value)
        return revisionArr.join('.')
    })
    return data
}


