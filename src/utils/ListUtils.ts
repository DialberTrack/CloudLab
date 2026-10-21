export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
    lowdb: {
        start: number;
        end: number;
    };
    mongoose: {
        skip: number;
        limit: number;
    };
    mysql: {
        limit: number;
        offset: number;
    };
}

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class ListUtils {
    private static readonly DEFAULT_PAGE = 1;
    private static readonly DEFAULT_LIMIT = 10;
    private static readonly MAX_LIMIT = 100;

    static getPaginationParams(page?: unknown, limit?: unknown): PaginationParams {
        const validLimit = Math.min(
            this.MAX_LIMIT,
            this.parsePositiveInteger(limit, this.DEFAULT_LIMIT)
        );
        const requestedPage = this.parsePositiveInteger(page, this.DEFAULT_PAGE);
        const maxPage = Math.floor((Number.MAX_SAFE_INTEGER - validLimit) / validLimit) + 1;
        const validPage = Math.min(requestedPage, maxPage);
        const offset = (validPage - 1) * validLimit;

        return {
            page: validPage,
            limit: validLimit,
            offset,
            lowdb: {
                start: offset,
                end: offset + validLimit
            },
            mongoose: {
                skip: offset,
                limit: validLimit
            },
            mysql: {
                limit: validLimit,
                offset
            }
        };
    }

    static paginateAndFilter<T>(
        items: T[],
        params: PaginationParams,
        filterFn?: (item: T) => boolean
    ): PaginationResult<T> {
        const filteredItems = filterFn ? items.filter(filterFn) : items;
        const total = filteredItems.length;

        return this.createResult(
            filteredItems.slice(params.lowdb.start, params.lowdb.end),
            total,
            params
        );
    }

    static createResult<T>(
        data: T[],
        total: number,
        params: PaginationParams
    ): PaginationResult<T> {
        return {
            data,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit)
        };
    }

    private static parsePositiveInteger(value: unknown, fallback: number): number {
        if (typeof value !== "number" && typeof value !== "string") {
            return fallback;
        }

        if (typeof value === "string" && value.trim() === "") {
            return fallback;
        }

        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 1) {
            return fallback;
        }

        return parsed;
    }
}
