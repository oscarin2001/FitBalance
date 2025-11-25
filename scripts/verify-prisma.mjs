#!/usr/bin/env node
import { execSync } from 'node:child_process';

function log(message) {
	console.log(`[verify-prisma] ${message}`);
}

const FALLBACK_FILE_URL = 'file:./dev.db';

function forceFileDatasource(varName) {
	const current = process.env[varName];
	if (!current) {
		log(`${varName} no definido. Usando fallback ${FALLBACK_FILE_URL} solo para validaciones.`);
	} else if (!current.startsWith('file:')) {
		log(`${varName} apunta a "${current}". Sobrescribiendo temporalmente con ${FALLBACK_FILE_URL} para comandos de Prisma CLI.`);
	}
	process.env[varName] = FALLBACK_FILE_URL;
}

forceFileDatasource('TURSO_DATABASE_URL');
forceFileDatasource('DATABASE_URL');

function run(command, description) {
	try {
		log(description);
		execSync(command, { stdio: 'inherit' });
	} catch (error) {
		log(`Error ejecutando "${command}"`);
		console.error(error?.message || error);
		process.exit(1);
	}
}

run('npx prisma --version', 'Verificando versión de Prisma CLI...');
run('npx prisma validate', 'Validando schema prisma/schema.prisma...');

log('Verificaciones de Prisma completadas.');
