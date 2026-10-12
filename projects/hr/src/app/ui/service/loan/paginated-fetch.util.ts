import { EMPTY, Observable, of } from 'rxjs';
import { expand, map, reduce, switchMap } from 'rxjs/operators';

interface PageResult<T> {
  items: T[];
  isLast: boolean;
}

const MAX_PAGES = 100;

/**
 * Reads every page of a list endpoint, so screens see all records instead of the backend's default
 * first page. Pages are 1-based (as on /advanceLoans). Accepts either a plain array per page or a
 * Spring-style page object ({ content, last, totalPages, first }).
 *
 * Stops on: an empty page, a page smaller than the first one, the backend's own "last page" signal,
 * a page identical to the previous one (backend ignoring the page parameter), or MAX_PAGES.
 */
export function fetchAllPages<T>(fetchPage: (page: number) => Observable<unknown>): Observable<T[]> {
  let firstPageSize = 0;
  let previousPageKey = '';

  const loadPage = (page: number): Observable<PageResult<T> & { page: number }> =>
    fetchPage(page).pipe(
      switchMap((response) => {
        const parsed = toPageResult<T>(response);
        // A Spring page object that says our "page 1" isn't the first page means the backend is
        // 0-based: fetch page 0 as well so nothing is skipped.
        if (page === 1 && isSpringPage(response) && (response as any).first === false) {
          return fetchPage(0).pipe(
            map((zeroResponse) => ({
              items: [...toPageResult<T>(zeroResponse).items, ...parsed.items],
              isLast: parsed.isLast,
              page
            }))
          );
        }
        return of({ ...parsed, page });
      })
    );

  return loadPage(1).pipe(
    expand((result) => {
      if (result.page === 1) {
        firstPageSize = result.items.length;
      }
      const pageKey = JSON.stringify(result.items.map((item: any) => item?.id ?? item));
      const repeatsPrevious = result.page > 1 && pageKey === previousPageKey;
      previousPageKey = pageKey;

      const done = result.isLast
        || repeatsPrevious
        || result.items.length === 0
        || result.items.length < firstPageSize
        || result.page >= MAX_PAGES;
      return done ? EMPTY : loadPage(result.page + 1);
    }),
    reduce((all, result) => {
      const pageKey = JSON.stringify(result.items.map((item: any) => item?.id ?? item));
      const alreadyHave = result.page > 1 && all.lastKey === pageKey;
      return {
        items: alreadyHave ? all.items : [...all.items, ...result.items],
        lastKey: pageKey
      };
    }, { items: [] as T[], lastKey: '' }),
    map((accumulated) => accumulated.items)
  );
}

function isSpringPage(response: unknown): boolean {
  return !!response && typeof response === 'object' && !Array.isArray(response) && Array.isArray((response as any).content);
}

function toPageResult<T>(response: unknown): PageResult<T> {
  if (Array.isArray(response)) {
    return { items: response as T[], isLast: false };
  }
  if (isSpringPage(response)) {
    const page = response as any;
    const isLast = page.last === true
      || (Number.isFinite(page.totalPages) && Number.isFinite(page.number) && page.number + 1 >= page.totalPages);
    return { items: page.content as T[], isLast };
  }
  return { items: [], isLast: true };
}
