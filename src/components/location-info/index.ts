/**
 * @file Координаты места.
 * @module components/location-info
 * @version 1.0.0
 * @description Интерактивный элемент с координатами, которые можно скопировать в буфер обмена.
 */

import copyIcon from '../../icons/copy.svg';
import {svgAsset} from '../../util';
import {DOMComponent} from '../dom';
import './index.css';

/** Интерактивный элемент с координатами, которые можно скопировать в буфер обмена. */
export default class LocationInfo extends DOMComponent {

	static create(
		lat: number,
		lng: number,
		classNames: string[] = []
	): LocationInfo {
		const div = document.createElement('div');
		div.classList.add('location-info', ...classNames);
		div.addEventListener('click', () => {
			navigator.clipboard?.writeText(`${lat},${lng}`);
		});

		for (const value of [lat, lng]) {
			const span = document.createElement('span');
			span.classList.add('location-info__coord');
			span.append(value.toString());
			div.appendChild(span);
		}

		const copyButton = svgAsset(copyIcon);
		copyButton.classList.add('location-info__copy-button');
		div.appendChild(copyButton);

		return new LocationInfo(div);
	}

}
