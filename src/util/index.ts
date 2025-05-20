/**
 * @file Сервисные функции.
 * @module util
 * @version 1.0.0
 */

const idMap = new WeakMap<object, number>();
let currentId = 0;
/**
 * Нумератор объектов.
 * @param {Object} obj - Любой объект.
 * @returns {number} Присвоенный ID объекта.
 */
export function id(obj: object): number {
	if (!idMap.has(obj))
		idMap.set(obj, currentId++);
	return idMap.get(obj);
}

const domParser = new DOMParser();
/**
 * Создать элемент SVG из исходного текста.
 * @param {string} source - Исходный код SVG.
 * @param {...string} classNames - Названия классов для элемента.
 * @returns {SVGElement}
 */
export function svgAsset(
	source: string,
	...classNames: string[]
): SVGElement {
	const svg = domParser.parseFromString(source, 'text/xml').rootElement;
	svg.classList.add(...classNames);
	return svg;
}
