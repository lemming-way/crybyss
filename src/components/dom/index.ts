/**
 * @file Компонент DOM
 * @module components/dom
 * @version 1.0.0
 */

/**
 * Базовый абстрактный класс для других компонентов интерфейса.
 */
export abstract class DOMComponent<TElement extends Element = Element> {

	declare domNode: TElement;

	/**
	 * @param {Element} node - элемент DOM, из которого создаётся объект.
	 */
	constructor(node: TElement) {
		this.domNode = node;
	}

}
