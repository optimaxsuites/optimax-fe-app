import { DateArray } from "./models/interface";

/**
 * Deconstruct a Date into an array suitable for new Date(...arr)
 * @param {Date} date
 * @returns {number[]} [year, month, day, hour, minute, second, millisecond]
 */
export function dateToArray(date: Date) {
	return [
		date.getFullYear(), // 4-digit year
		date.getMonth(), // 0–11
		date.getDate(), // 1–31
		date.getHours(), // 0–23
		date.getMinutes(), // 0–59
		date.getSeconds(), // 0–59
		date.getMilliseconds(), // 0–999
	];
}

/** FIXME: Seems like the time arrays from the server are botched :/ and this function doesn't really remedy it */
export function arrayToDate(array: Array<number> | DateArray) {
	const cleanedArr = array.map((val, index) => {
		// For some reason the second element (the month), keeps on increasing by 1
		if (index === 1) {
			return val - 1;
		}
		return val;
	});

	//@ts-expect-error
	return new Date(...cleanedArr);
}
