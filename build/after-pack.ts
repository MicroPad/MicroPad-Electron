import { AfterPackContext, Platform } from 'electron-builder';
import * as exec from 'promised-exec';

declare function exec(command: string): Promise<string>;

export default async function(ctx: AfterPackContext) {
	await disableSandboxOnLinux(ctx);
}

async function disableSandboxOnLinux(ctx: AfterPackContext) {
	const platform = ctx.packager.platform.name;
	if (platform !== Platform.LINUX.name) return;

	console.log(ctx.targets);

	// TODO: Create file that will call the actual thing with --no-sandbox
	await exec(``);
}
