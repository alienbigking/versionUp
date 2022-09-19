#! /usr/bin/env node

'use strict'

import {require, packageJson} from "../utils/index.js"
import {program} from 'commander'

program
    .name('version-cli')
    .description(`当前版本：${packageJson.version}，version-cli将为你提供默认的版本升级号，可手动选择将要升级的版本`)
    .version(`${packageJson.version}`)
    .usage('<command> [options]')
    .command('init', '请选择要升级的版本号')
    .command('add', '请手动输入版本号')
    .command('delete', '删除当前版本号')
    .command('show', '显示当前版本号')

program.parse(process.argv)