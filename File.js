"use strict";

import URL from "url";
import fs from "fs";
import { promises } from "dns";

export default class File {

	static async *readStream (url, chunksize = 64 * 1024) {
		const _url = URL.parse(url);

		if (!_url.protocol)
			throw new Error(`No/invalid protocol in "${url}".`);
		
		switch (_url.protocol) {
			case "file:": {
				const stream = fs.createReadStream(_url.pathname, {
					encoding: "utf8",
					highWaterMark: chunksize
				});

				let buffer = "";
				for await (const chunk of stream) {
					buffer += chunk;
					const to = buffer.lastIndexOf("\n");
					if (to === -1) {
						continue;
					}
					yield buffer.slice(0, to + 1);
					buffer = buffer.slice(to + 1);
				}

				if (buffer[0])
					yield buffer;
				break;
			}
			default: throw new Error(`Unsupported protocol "${_url.protocol}".`);
		}
	}

	// TODO: Actually make async writestream
	static writeStream (path, data) {
		let resolve;
		let reject;
		const promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		fs.writeFile(path, data, err => {
			return (err)
				? reject(err)
				: resolve(data);
		});
		return promise;
	}

}