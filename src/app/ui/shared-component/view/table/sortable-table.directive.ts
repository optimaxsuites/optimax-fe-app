import { AfterViewInit, Directive, ElementRef, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
	selector: 'table[appSortableTable]'
})
export class SortableTableDirective implements AfterViewInit, OnDestroy {
	private listeners: Array<() => void> = [];
	private currentColumnIndex: number | null = null;
	private direction: 'asc' | 'desc' = 'asc';

	constructor(
		private host: ElementRef<HTMLTableElement>,
		private renderer: Renderer2
	) {}

	ngAfterViewInit(): void {
		this.bindHeaderClicks();
	}

	ngOnDestroy(): void {
		this.listeners.forEach(unlisten => unlisten());
		this.listeners = [];
	}

	private bindHeaderClicks(): void {
		const headers = Array.from(this.host.nativeElement.querySelectorAll('thead th'));
		headers.forEach((header, index) => {
			this.renderer.addClass(header, 'sortable-header');
			const unlisten = this.renderer.listen(header, 'click', () => this.sortByColumn(index));
			this.listeners.push(unlisten);
		});
	}

	private sortByColumn(index: number): void {
		const tbody = this.host.nativeElement.tBodies?.[0];
		if (!tbody) return;

		const rows = Array.from(tbody.rows).filter(row => row.cells.length > index);
		if (rows.length <= 1) return;

		const nextDirection: 'asc' | 'desc' =
			this.currentColumnIndex === index && this.direction === 'asc' ? 'desc' : 'asc';

		this.currentColumnIndex = index;
		this.direction = nextDirection;

		this.updateHeaderStates(index, nextDirection);

		rows.sort((rowA, rowB) => {
			const valueA = this.extractCellValue(rowA, index);
			const valueB = this.extractCellValue(rowB, index);
			const compareResult = this.compareValues(valueA, valueB);
			return nextDirection === 'asc' ? compareResult : -compareResult;
		});

		rows.forEach(row => tbody.appendChild(row));
	}

	private updateHeaderStates(activeIndex: number, direction: 'asc' | 'desc'): void {
		const headers = Array.from(this.host.nativeElement.querySelectorAll('thead th'));
		headers.forEach((header, idx) => {
			this.renderer.removeClass(header, 'sorted-asc');
			this.renderer.removeClass(header, 'sorted-desc');
			if (idx === activeIndex) {
				this.renderer.addClass(header, direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
			}
		});
	}

	private extractCellValue(row: HTMLTableRowElement, columnIndex: number): string {
		const cell = row.cells.item(columnIndex);
		return (cell?.textContent || '').trim();
	}

	private compareValues(valueA: string, valueB: string): number {
		const numberA = this.toNumber(valueA);
		const numberB = this.toNumber(valueB);

		if (numberA !== null && numberB !== null) {
			return numberA - numberB;
		}

		const dateA = this.toDate(valueA);
		const dateB = this.toDate(valueB);

		if (dateA !== null && dateB !== null) {
			return dateA - dateB;
		}

		return valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' });
	}

	private toNumber(value: string): number | null {
		const normalized = value.replace(/[^\d.-]/g, '');
		if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
			return null;
		}

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	}

	private toDate(value: string): number | null {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? null : parsed;
	}
}
