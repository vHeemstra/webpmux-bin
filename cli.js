#!/usr/bin/env node
import process from 'node:process'
import { spawn } from 'node:child_process'
import webpmux from './index.js'

spawn(webpmux, process.argv.slice(2), { stdio: 'inherit' })
	.on('exit', process.exit)
