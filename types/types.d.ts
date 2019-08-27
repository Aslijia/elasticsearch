export interface Configure {
    host: string,
    pipeline?: string,
    bulk?: number,
    waitForActiveShards?: string,
    interval?: number
}

export function configure(cfg: Configure): Function;