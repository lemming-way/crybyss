/**
 * @file Компонент контейнер карты.
 * @module components/map-container
 * @version 1.0.0
 */

import {DOMComponent} from '../dom';
import Map from '../map';
import MapOverlay from '../map-overlay';
import './index.css';

/**
 * Компонент контейнер карты.
 */
class MapContainer extends DOMComponent {

	/**
	 * Получить элемент карты в заданном контейнере.
	 * @param {Element} domNode - Контейнер карты.
	 * @returns {HTMLElement}
	 */
	static findMapElement(domNode: Element): HTMLElement {
		return domNode.getElementsByClassName('map')[0] as HTMLElement;
	}

	/**
	 * Получить слой элементов, наложенных поверх карты.
	 * @param {Element} domNode - Контейнер карты.
	 * @returns {Element}
	 */
	static findOverlayElement(domNode: Element): Element {
		return domNode.getElementsByClassName('map-overlay')[0];
	}

	/**
	 * @param {Element} domNode - DOM элемент контейнера.
	 * @param {Map} map - Объект карты.
	 * @param {MapOverlay} overlay - Слой наложения на карту.
	 */
	constructor(
		domNode: Element,
		map: Map,
		overlay: MapOverlay,
	) {
		super(domNode);

		const setOverlayBounds = () => {
			map.setOverlayBounds(...overlay.bounds);
		};
		setOverlayBounds();
		overlay.events.addEventListener('resize', setOverlayBounds);
	}

}

export default MapContainer;
