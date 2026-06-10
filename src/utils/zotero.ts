// Following functions are copied from 
// https://github.com/mgmeyers/obsidian-pandoc-reference-list/blob/main/src/bib/helpers.ts
// with some modifications
import http, { request } from "http";
import { normalizePath } from "obsidian";
import type { DataAdapter } from "obsidian";
import { DEFAULT_HEADERS, DEFAULT_ZOTERO_PORT } from "src/constants";
import { CSLList, PartialCSLEntry } from "src/types";
import { parseZoteroCache, parseZoteroJsonRpcList } from "./zoteroResponse";

export type ZoteroBibliographyResult = {
    entries: CSLList;
    source: 'cache' | 'live';
    warning?: string;
}

const BIBLIOGRAPHY_SEARCH = [
    ['itemType', 'isNot', 'annotation'],
    ['itemType', 'isNot', 'attachment'],
    ['itemType', 'isNot', 'note'],
];

export async function isZoteroRunning(port: string = DEFAULT_ZOTERO_PORT) {
    const options = {
        hostname: '127.0.0.1',
        port: port,
        path: '/better-bibtex/cayw?probe=true',
        method: 'GET',
    };

    const res = await Promise.race<string | null>([
        new Promise<string | null>((resolve) => {
            const req = http.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', () => {
                resolve(null); // if connection is refused, return false
            });
            req.end();
        }),
        new Promise<null>((resolve) => {
            window.setTimeout(() => {
                resolve(null);
            }, 150);
        }),
    ]);

    return res?.toString() === 'ready';
}

function applyGroupID(list: CSLList, groupId: number) {
    return list.map((item) => {
        item.groupID = groupId;
        return item;
    });
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const requestJsonRpc = async (
    port: string,
    method: string,
    params: unknown[]
): Promise<string> => {
    const body = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
    });

    return new Promise((resolve, reject) => {
        const postRequest = request(
            {
                host: '127.0.0.1',
                port,
                path: '/better-bibtex/json-rpc',
                method: 'POST',
                headers: {
                    ...DEFAULT_HEADERS,
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (result) => {
                let output = '';
                result.setEncoding('utf8');
                result.on('data', (chunk) => (output += chunk));
                result.on('error', (error) =>
                    reject(new Error(`Error connecting to Zotero: ${error.message}`))
                );
                result.on('aborted', () =>
                    reject(new Error('The Zotero response was interrupted.'))
                );
                result.on('end', () => {
                    if (result.statusCode && result.statusCode >= 400) {
                        reject(new Error(`Better BibTeX returned HTTP ${result.statusCode}.`));
                        return;
                    }
                    resolve(output);
                });
            }
        );

        postRequest.on('error', (error) =>
            reject(new Error(`Error connecting to Zotero: ${error.message}`))
        );
        postRequest.write(body);
        postRequest.end();
    });
};

const readCachedBibliography = async (
    adapter: DataAdapter,
    cached: string,
    groupId: number
): Promise<CSLList | null> => {
    if (!(await adapter.exists(cached))) return null;
    try {
        return applyGroupID(parseZoteroCache(await adapter.read(cached)), groupId);
    } catch {
        return null;
    }
};

export async function getZBib(
    port: string,
    adapter: DataAdapter,
    cacheDir: string,
    groupId: number,
    loadCached?: boolean
): Promise<ZoteroBibliographyResult | null> {
    const isRunning = await isZoteroRunning(port);
    const cached = normalizePath(`${cacheDir}/zotero-library-${groupId}.json`);

    if (!(await adapter.exists(cacheDir))) {
        await adapter.mkdir(cacheDir);
    }

    if (loadCached) {
        const entries = await readCachedBibliography(adapter, cached, groupId);
        return entries ? { entries, source: 'cache' } : null;
    }

    if (!isRunning) {
        const entries = await readCachedBibliography(adapter, cached, groupId);
        return entries ? { entries, source: 'cache' } : null;
    }

    try {
        const response = await requestJsonRpc(
            port,
            'item.search',
            [BIBLIOGRAPHY_SEARCH, groupId]
        );
        const entries = applyGroupID(
            parseZoteroJsonRpcList(response, 'Better BibTeX bibliography search'),
            groupId
        );
        await adapter.write(cached, JSON.stringify(entries));
        return { entries, source: 'live' };
    } catch (error) {
        const entries = await readCachedBibliography(adapter, cached, groupId);
        if (entries) {
            return {
                entries,
                source: 'cache',
                warning: getErrorMessage(error),
            };
        }
        throw error;
    }
}


export async function getZUserGroups(
    port: string = DEFAULT_ZOTERO_PORT
): Promise<Array<{ id: number; name: string; }>> {
    if (!(await isZoteroRunning(port))) return [];

    return new Promise((res, rej) => {
        const body = JSON.stringify({
            jsonrpc: '2.0',
            method: 'user.groups',
        });

        const postRequest = request(
            {
                host: '127.0.0.1',
                port: port,
                path: '/better-bibtex/json-rpc',
                method: 'POST',
                headers: {
                    ...DEFAULT_HEADERS,
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (result) => {
                let output = '';

                result.setEncoding('utf8');
                result.on('data', (chunk) => (output += chunk));
                result.on('error', (e) => rej(new Error(`Error connecting to Zotero: ${e.message}`)));
                result.on('close', () => {
                    rej(new Error('Error: cannot connect to Zotero'));
                });
                result.on('end', () => {
                    try {
                        res((JSON.parse(output) as {
                            result: Array<{ id: number; name: string }>;
                        }).result);
                    } catch (e) {
                        rej(e instanceof Error ? e : new Error(String(e)));
                    }
                });
            }
        );

        postRequest.write(body);
        postRequest.end();
    });
}

function panNum(n: number) {
    if (n < 10) return `0${n}`;
    return n.toString();
}

function timestampToZDate(ts: number) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${panNum(d.getUTCMonth() + 1)}-${panNum(
        d.getUTCDate()
    )} ${panNum(d.getUTCHours())}:${panNum(d.getUTCMinutes())}:${panNum(
        d.getUTCSeconds()
    )}`;
}

export async function getZModified(
    port: string = DEFAULT_ZOTERO_PORT,
    groupId: number,
    since: number
): Promise<CSLList> {
    if (!(await isZoteroRunning(port))) return [];

    const response = await requestJsonRpc(
        port,
        'item.search',
        [[
            ...BIBLIOGRAPHY_SEARCH,
            ['dateModified', 'isAfter', timestampToZDate(since)],
        ], groupId]
    );
    return parseZoteroJsonRpcList(response, 'Better BibTeX modified-item search');
}

export async function refreshZBib(
    port: string,
    adapter: DataAdapter,
    cacheDir: string,
    groupId: number,
    since: number
) {
    if (!(await isZoteroRunning(port))) {
        return null;
    }

    const cached = normalizePath(`${cacheDir}/zotero-library-${groupId}.json`);
    if (!(await adapter.exists(cacheDir))) {
        await adapter.mkdir(cacheDir);
    }
    if (!(await adapter.exists(cached))) {
        return null;
    }

    const mList = await getZModified(port, groupId, since);

    if (!mList?.length) {
        return null;
    }

    const modified: Map<string, PartialCSLEntry> = new Map();
    const newKeys: Set<string> = new Set();

    for (const mod of mList) {
        mod.id = mod.citekey ?? mod['citation-key'] ?? mod.id;
        if (!mod.id) continue;
        modified.set(mod.id, mod);
        newKeys.add(mod.id);
    }

    const list = parseZoteroCache(await adapter.read(cached));

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (modified.has(item.id)) {
            newKeys.delete(item.id);
            const modifiedItem = modified.get(item.id);
            if (modifiedItem !== undefined) {
                list[i] = modifiedItem;
            }
        }
    }

    for (const key of newKeys) {
        const modifiedItem = modified.get(key);
        if (modifiedItem !== undefined) {
            list.push(modifiedItem);
        }
    }

    await adapter.write(cached, JSON.stringify(list));

    return {
        list: applyGroupID(list, groupId),
        modified,
    };
}
