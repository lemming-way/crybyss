/**
 * @file Интерфейс карты
 * @module components/map
 * @version 1.0.0
 * @description Интерфейс класса-обёртки для Leaflet.
 */

import {TypedEventTarget} from 'typescript-event-target';
import {Marker} from 'leaflet';
import {Graph} from '@datastructures-js/graph';
import {DOMComponent} from '../dom';
import './index.css';

/** Низкоуровневый интерфейс карты. */
export default abstract class Map extends DOMComponent {

	/** Базовый слой, желательно использовать addLayer вместо него. */
	abstract mainLayer: Layer;
	/**
	 * Создаёт и возвращает новый слой.
	 * Методов для именования и получения слоёв нет, это выходит за рамки ответственности класса.
	 */
	abstract addLayer(): Layer;

	/**
	 * Сдвинуть карту по заданным координатам.
	 */
	abstract panTo(lat: number, lng: number): void;

	/**
	 * Разместить и масштабировать карту по заданному прямоугольнику.
	 */
	abstract fitBounds( south: number, west: number, north: number, east: number ): void;

	/** Установка границ, за которые не будут выходить попапы. */
	abstract setOverlayBounds(
		top: number,
		right: number,
		bottom: number,
		left: number,
	): void;

	events: TypedEventTarget<{
		pointermove: PointerEvent,
	}> = new TypedEventTarget();

	/**
	 * Преобразовать координаты в точку на карте в пикселях.
	 */
	coordsToPoint(lat: number, lng: number): [number, number] {
		return [lng, lat];
	}

}

/**
 * Интерфейс для объекта, который можно показывать и скрывать.
 */
export interface VisibilityControl {
	visible: boolean;
	show: () => void;
	hide: () => void;
	toggle: () => void;
	events: TypedEventTarget<{
		visibilitychange: Event,
	}>;
}

/** Слой карты, используется для непосредственного нанесения маркеров и прочих данных. */
export abstract class Layer<
	TMarker extends MapMarker = MapMarker
> implements VisibilityControl {

	abstract addMarker(marker: TMarker): void;
	abstract addInteractiveMarker(marker: TMarker & InteractiveMapMarker): void;
	abstract removeMarker(marker: TMarker): void;
	abstract drawPolyline(polyline: MapPolyline): void;
	abstract clearPolyline(polyline: MapPolyline): void;

	abstract visible: boolean;
	abstract show(): void;
	abstract hide(): void;
	abstract toggle(): void;

	events: TypedEventTarget<{
		visibilitychange: Event,
	}> = new TypedEventTarget();

}

/** Интерфейс маркера на карте. */
export interface MapMarker {
	lat: number;
	lng: number;
	icon: Element;
	iconSize: [number, number];
	events: TypedEventTarget<{
		locationchange: Event,
	}>;
	marker?: Marker | undefined;
}

/**
 * Интерфейс интерактивного маркера на карте.
 * @description При активации маркера открывается всплывающее окно.
 */
export interface InteractiveMapMarker extends MapMarker {
	popupContent: () => Promise<Element>;
}

/**
 * Линия на карте.
 */
export interface MapPolyline {
	points: (MapPolylinePoint | InteractiveMapPolylinePoint)[];
	color: number;
}

/**
 * Интерактивная линия на карте.
 * @description Реагирует на события. Поскольку линия не является отдельным DOM элементом,
 * события передаются слою, на котором нарисована линия.
 */
export interface InteractiveMapPolyline extends MapPolyline {
	events: Record<string, (event: any) => void>;
}

/**
 * Узел линии.
 */
export interface MapPolylinePoint {
	lat: number;
	lng: number;
}

/**
 * Интерактивный узел линии.
 * @description При активации открывается всплывающее окно.
 */
export interface InteractiveMapPolylinePoint extends MapPolylinePoint {
	popupContent: () => Promise<Element>;
}

/**
 * Событие мыши или тачпада.
 */
export class PointerEvent extends Event {

	declare lat: number;
	declare lng: number;

	/**
	 * Создаёт объект события.
	 * @param {string} type - Тип события.
	 * @param {number} lat - Географическая широта.
	 * @param {number} lng - Географическая долгота.
	 */
	constructor(type: string, lat: number, lng: number) {
		super(type);
		this.lat = lat;
		this.lng = lng;
	}

}
