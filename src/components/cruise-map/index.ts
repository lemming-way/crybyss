/**
 * @file Компоненты карты.
 * @module components/cruise-map
 * @version 1.0.0
 * @description Модуль содержит классы, управляющие маркерами и описаниями на карте.
 */

import {TypedEventTarget} from 'typescript-event-target';
import {Marker} from 'leaflet';
import stopMarkerIcon from '../../icons/stop-marker.png';
import gatewayMarkerIcon from '../../icons/gateway.svg';
import linerIcon from '../../icons/liner.svg';
import linersIcon from '../../icons/liners.svg';
import stopIcon from '../../icons/stop.svg';
import sunriseIcon from '../../icons/sunrise.svg';
import sunsetIcon from '../../icons/sunset.svg';
import linerMarkerIcon from '../../icons/liner-marker.svg';
import derevoIcon from '../../icons/derevo.svg'
import fotoIcon from '../../icons/foto_new.svg'
import museyIcon from '../../icons/musey.svg'
import mostIcon from '../../icons/most.svg'
import pillarIcon from '../../icons/pillar.svg'
import mayakIcon from '../../icons/mayak.svg'
import voenIcon from '../../icons/voen.svg'
import yahtaIcon from '../../icons/yahta.svg'
import yakorIcon from '../../icons/yakor.svg'
import museyMarkerIcon from '../../icons/musey-marker.svg'
import mostMarkerIcon from '../../icons/most-marker.svg'
import pillarMarkerIcon from '../../icons/pillar-marker.svg'
import derevoMarkerIcon from '../../icons/derevo-marker.svg'
import mayakMarkerIcon from '../../icons/mayak-marker.svg'
import fotoMarkerIcon from '../../icons/foto_new-marker.svg'
import voenMarkerIcon from '../../icons/voen-marker.svg'
import yahtaMarkerIcon from '../../icons/yahta-marker.svg'
import yakorMarkerIcon from '../../icons/yakor-marker.svg'
import circleIcon from '../../icons/circle.svg'
import {svgAsset} from '../../util';
import Text from '../../state/text';
import {Cruise, Company, Ship, Location, CruiseRoute, TrackPoint, TrackLocation, LocationType, defaultCompanyColor} from '../../state/cruise';
import WorldMap, {
	VisibilityControl, Layer,
	MapMarker, InteractiveMapMarker, MapPolyline, InteractiveMapPolyline
} from '../map';
import LocatedItemDescription, {
	LocatedItemDescriptionGroup,
	LocatedItemDescriptionRow,
	LocatedItemDescriptionText,
	LocatedItemDescriptionRange,
	LocatedItemDescriptionButton,
	LocatedItemDescriptionImage,
	LocatedItemDescriptionIcon,
	LocatedItemDescriptionLocation,
	LocatedItemDescriptionGap,
} from '../located-item-description';
import './index.css';

// Иконки для маркеров мест по категориям
const categorizedMarkers: Record<string, string> = {
	'Путешествия' : pillarMarkerIcon, // default
	'Музеи' : museyMarkerIcon,
	'ГТС, мосты' : mostMarkerIcon,
	'Исторические достопримечательности' : pillarMarkerIcon,
	'Событийный туризм' : pillarMarkerIcon, // default
	'Спорт' : pillarMarkerIcon, // default
	'Памятники природы' : derevoMarkerIcon,
	'Маяки' : mayakMarkerIcon,
	'Фотографические места' : fotoMarkerIcon,
	'Памятники воинской славы' : voenMarkerIcon,
	'Стоянки, укрытия, причалы' : yahtaMarkerIcon,
	'Стоянки' : yakorMarkerIcon
};

// Иконки для попапов мест по категориям
const categorizedIcons: Record<string, string> = {
	'Путешествия' : pillarIcon, // default
	'Музеи' : museyIcon,
	'ГТС, мосты' : mostIcon,
	'Исторические достопримечательности' : pillarIcon,
	'Событийный туризм' : pillarIcon, // default
	'Спорт' : pillarIcon, // default
	'Памятники природы' : derevoIcon,
	'Маяки' : mayakIcon,
	'Фотографические места' : fotoIcon,
	'Памятники воинской славы' : voenIcon,
	'Стоянки, укрытия, причалы' : yahtaIcon,
	'Стоянки' : yakorIcon
};

// Цвета для иконок
const iconColors: Record<string, string> = {
	'Путешествия' : 'var(--main)', // default
	'Музеи' : 'var(--main)',
	'ГТС, мосты' : 'var(--main)',
	'Исторические достопримечательности' : 'var(--main)',
	'Событийный туризм' : 'var(--main)', // default
	'Спорт' : 'var(--main)', // default
	'Памятники природы' : '#00A651',
	'Маяки' : 'var(--main)',
	'Фотографические места' : '#00A651',
	'Памятники воинской славы' : 'var(--main)',
	'Стоянки, укрытия, причалы' : 'var(--main)',
	'Стоянки' : 'var(--main)'
};

/**
 * Отображение круизов, кораблей, путей, остановок и т.д. на карте.
 */
export default class CruiseMap {

	/** Ссылка на объект карты.
	  * @type {WorldMap}
	  */
	declare private map: WorldMap;

	declare private _mapMode: string;
	/** Режим работы карты.
	  * @type {string}
	  */
	get mapMode() { return this._mapMode; }

	declare private _trackLayer: Layer;
	/** Слой треков круизов.
	  * @type {VisibilityControl}
	  */
	get trackLayer(): VisibilityControl {return this._trackLayer;}
	declare private _sunsetsLayer: Layer;
	/** Слой закатов.
	  * @type {VisibilityControl}
	  */
	get sunsetsLayer(): VisibilityControl {return this._sunsetsLayer;}
	declare private _sunrisesLayer: Layer;
	/** Слой восходов.
	  * @type {VisibilityControl}
	  */
	get sunrisesLayer(): VisibilityControl {return this._sunrisesLayer;}
	declare private _gatewaysLayer: Layer;
	/** Слой шлюзов.
	  * @type {VisibilityControl}
	  */
	get gatewaysLayer(): VisibilityControl {return this._gatewaysLayer;}
	declare private _shipLayer: Layer<ShipMarker>;
	/** Слой маркеров теплоходов.
	  * @type {VisibilityControl}
	  */
	get shipLayer(): VisibilityControl {return this._shipLayer;}
	declare private _stopsLayer: Layer;
	/** Слой стоянок.
	  * @type {VisibilityControl}
	  */
	get stopsLayer(): VisibilityControl {return this._stopsLayer;}
	declare private _sightsLayer: Layer;
	/** Слой достопримечательностей.
	  * @type {VisibilityControl}
	  */
	get sightsLayer(): VisibilityControl {return this._sightsLayer;}

	/**
	 * Добавить интерактивный маркер.
	 * @param {("track"|"sunsets"|"sunrises"|"gateways"|"ship"|"stops"|"sights")} layer - Слой, на который добавляется маркер.
	 * @param {InteractiveMapMarker} interactiveMarker - объект маркера (см. {@link module:components/map map}).
	 * @returns {void}
	 * @description Добавляет на карту маркер со всплывающим описанием.
	 */
	addInteractiveMarker(layer: 'track' | 'sunsets' | 'sunrises' | 'gateways' | 'ship' | 'stops' | 'sights', interactiveMarker: any) {
		this[ `_${layer}Layer` ].addInteractiveMarker( interactiveMarker );
	}

	/**
	 * Удалить маркер.
	 * @param {("track"|"sunsets"|"sunrises"|"gateways"|"ship"|"stops"|"sights")} layer - Слой, с которого удалить маркер.
	 * @param {MapMarker} marker - обект маркера (см. {@link module:components/map map})
	 * @returns {void}
	 */
	removeMarker(layer: 'track' | 'sunsets' | 'sunrises' | 'gateways' | 'ship' | 'stops' | 'sights', marker: any) {
		this[ `_${layer}Layer` ].removeMarker( marker );
	}

	/**
	 * Нарисовать ломаную.
	 * @param {("track"|"sunsets"|"sunrises"|"gateways"|"ship"|"stops"|"sights")} layer - Слой для размещения линии.
	 * @param {MapPolyline} polyline - обект ломаной (см. {@link module:components/map map})
	 * @returns {void}
	 * @description Добавляет на карту ломаную линию по заданным точкам.
	 */
	drawPolyline(layer: 'track' | 'sunsets' | 'sunrises' | 'gateways' | 'ship' | 'stops' | 'sights', polyline: MapPolyline) {
		this[ `_${layer}Layer` ].drawPolyline( polyline );
	}

	/**
	 * Удалить ломаную.
	 * @param {("track"|"sunsets"|"sunrises"|"gateways"|"ship"|"stops"|"sights")} layer - Слой для удаления линии.
	 * @param {MapPolyline} polyline - обект ломаной (см. {@link module:components/map map})
	 * @returns {void}
	 */
	clearPolyline(layer: 'track' | 'sunsets' | 'sunrises' | 'gateways' | 'ship' | 'stops' | 'sights', polyline: MapPolyline) {
		this[ `_${layer}Layer` ].clearPolyline( polyline );
	}

	private _cruises: Map<string, CruiseAssets> = new Map();
	/**
	 * Получить объект круиза.
	 * @param {string} id - ID круиза.
	 * @returns {CruiseAssets} Объект круиза, размещённого на карте.
	 */
	cruiseAsset( id: string ) {
		return this._cruises.get( id );
	}

	private _ships: Map<string, ShipMarker> = new Map();
	/**
	 * Получить объект теплохода.
	 * @param {string} id - ID теплохода.
	 * @returns {ShipMarker} Объект теплохода, размещённого на карте.
	 */
	shipMarker( id: string ) {
		return this._ships.get( id );
	}
	/**
	 * Список всех теплоходов, размещённых на карте.
	 * @returns {Ship[]} Данные теплоходов, размещённых на карте (см. {@link module:state/api api}).
	 */
	get ships(): Ship[] { return [ ...this._ships.values() ].map( item => item.ship ); }

	declare selectedShip: ShipMarker | undefined;

	private stoppedShips: Record<string, SVGElement[]> = {};

	declare private _text: Text;
	/** Текстовые константы, загруженные в конструкторе класса. */
	get text() { return this._text; }
	/** Счетчик остановок для избежания повторного их добавления */
	private _attachedStops: Record<string, {
		marker: InteractiveMapMarker,
		timesAttached: number,
	}> = {};
	/** Счетчик достопримечательностей для избежания повторного их добавления */
	private _attachedSights: Record<string, {
		marker: InteractiveMapMarker,
		timesAttached: number,
	}> = {};
	/** Счетчик шлюзов для избежания повторного их добавления */
	private _attachedGateways: Record<string, {
		marker: InteractiveMapMarker,
		timesAttached: number,
	}> = {};

	/**
	 * Разместить на карте маркер стоянки, достопримечательности или шлюза.
	 * @param {string} id - ID объекта.
	 * @param {(0|1|2)} type - Тип объекта (см. {@link module:state/api api}).
	 * @param {string} category - Категория достопримечательности (для стоянок и шлюзов не применяется).
	 * @param {number} lat - Географическая широта.
	 * @param {number} lng - Географическая долгота.
	 * @param {Promise} popup - Промис, возвращающий всплывающее окно (см. {@link module:components/map map}).
	 * @returns {void}
	 */
	attachLocationMarker( id: string, type: LocationType, category: string, lat: number, lng: number, popup: InteractiveMapMarker['popupContent'] ): LocationMarker {
		const counter = [ this._attachedStops, this._attachedSights, this._attachedGateways ][ type ];
		const layer = [ this._stopsLayer, this._sightsLayer, this._gatewaysLayer ][ type ];
		if (!!counter[ id ]) {
			counter[ id ].timesAttached++;
		}
		else {
			const marker = new LocationMarker( type, category, lat, lng, popup );
			layer.addInteractiveMarker( marker );
			counter[ id ] = { marker, timesAttached: 1 };
		}
		return counter[ id ].marker;
	}

	/**
	 * Удалить маркер стоянки, достопримечательности или шлюза.
	 * @param {string} id - ID объекта.
	 * @param {(0|1|2)} type - Тип объекта (см. {@link module:state/api api}).
	 * @returns {void}
	 */
	detachLocationMarker( id: string, type: LocationType ) {
		const counter = [ this._attachedStops, this._attachedSights, this._attachedGateways ][ type ];
		const layer = [ this._stopsLayer, this._sightsLayer, this._gatewaysLayer ][ type ];
		if (!!counter[ id ]) {
			counter[ id ].timesAttached--;
			if (!counter[ id ].timesAttached) {
				layer.removeMarker( counter[ id ].marker );
				delete counter[ id ];
			}
		}
	}

	private _timelinePoint: Date = new Date(0);
	/** Текущий выбранный момент времени
	  * @type {Date}
	  */
	get timelinePoint(): Date {
		return this._timelinePoint;
	}
	set timelinePoint(value) {
		if (+this._timelinePoint === +value)
			return;
		this._timelinePoint = value;
		for (const shipMarker of this._ships.values()) {
			shipMarker.move(value);
		}
	}

	events: TypedEventTarget<{
		timerangechanged: Event,
	}> = new TypedEventTarget();

	/**
	 * Создаёт экземпляр CruiseMap.
	 * @param {WorldMap} map - Объект карты.
	 * @param {Object} text - Текстовые константы для использования на карте.
	 * @param {("cruise"|"stops"|"single-stop"|"places"|"single-place"|"default")} mapMode - Режим работы карты.
	 */
	constructor(map: WorldMap, text: Text, mapMode: string) {
		this.map = map;
		this._mapMode = mapMode;
		this._trackLayer = map.addLayer();
		this._sightsLayer = map.addLayer();
		this._gatewaysLayer = map.addLayer();
		this._stopsLayer = map.addLayer();
		this._sunsetsLayer = map.addLayer();
		this._sunrisesLayer = map.addLayer();
		this._shipLayer = map.addLayer();

		this._text = text;

		for (const layer of [ 'sunsets', 'sunrises', 'gateways', 'stops', 'sights' ]) {
			const ucLayer = layer[0].toUpperCase() + layer.slice(1);
			const mapLayer: VisibilityControl = ( this as any )[ `_${layer}Layer` ];
			mapLayer.events.addEventListener( 'visibilitychange', () => {
				if (mapLayer.visible) {
					for (const cruise of this._cruises.values()) {
						( cruise as any )[ `show${ucLayer}` ]();
					}
				}
			} );
		}

		this._shipLayer.events.addEventListener( 'visibilitychange', () => {
			if (this._shipLayer.visible) this._trackLayer.show();
			else this._trackLayer.hide();
		} );
	}

	/**
	 * Обновляет счётчик количества теплоходов, не занятых в круизе в данный момент.
	 * @returns {void}
	 */
	updateShipsCounter() {
		const shipsNotInCruise = [ ...this._ships.values() ].filter( ship => !ship.activeCruise ).length;
		const counterElement = document.querySelector('.map-overlay--ships-count') as HTMLElement;
		if (counterElement) {
			counterElement.innerText = shipsNotInCruise.toString().padStart(3, '0');
		}
	}

	/**
	 * Добавить круиз на карту.
	 * @param {Cruise} cruise - Объект данных круиза (см. {@link module:state/api api}).
	 * @returns {void}
	 * @description Добавление круизов используется для показа треков круизов, стоянок, мест, шлюзов,
	 * восходов и закатов. Для теплоходов, добавленных на карту, круизы добавляются и удаляются автоматически.
	 * Не рекомендуется использовать напрямую.
	 */
	addCruise(cruise: Cruise) {
		if (this._cruises.has( cruise.id ))
			return;

		this._cruises.set( cruise.id, new CruiseAssets( this, cruise ) );
	}

	/**
	 * Удалить круиз с карты.
	 * @param {string} id - ID круиза.
	 * @returns {void}
	 */
	removeCruise(id: string) {
		if (!this._cruises.has(id))
			return;
		const cruise = this._cruises.get(id);
		this._cruises.delete(id);
		cruise.remove();
	}

	/**
	 * Добавить теплоход на карту.
	 * @param {Ship} ship - Объект данных теплохода (см. {@link module:state/api api}).
	 * @returns {void}
	 * @description При добавлении теплохода на карте отображается маркер теплохода в позиции,
	 * соответствующей заданному моменту времени. Загружаются круизы, которые выполняет теплоход
	 * в это время. По клику теплоход становится активным, и для него отображается трек круиза,
	 * маркеры стоянок, мест, шлюзов, восходов и закатов. Если в заданный момент времени теплоход
	 * не находится в круизе, маркер не отображается. Информационное табло на карте показывает
	 * количество теплоходов, добавленных на карту, но не находящихся в круизе. Текущее время карты
	 * устанавливается сеттером {@link module:components/cruise-map~CruiseMap#timelinePoint timelinePoint}.
	 */
	addShip(ship: Ship) {
		if (this._ships.has( ship.id )) return;

		const shipMarker = new ShipMarker(
			this, ship, ship.company,
			this.timelinePoint
		);

		this._ships.set( ship.id, shipMarker );
		this.updateShipsCounter();

		if (this._mapMode === 'cruise') {
			shipMarker.activate();
			const cruise = ship.cruises()[Symbol.iterator]().next().value;
			cruise?.route.then( ( route: CruiseRoute ) => {
				if (!!route.points.length) {
					const [ latitudes, longitudes ] = route.points.reduce( ( ret, point ) => {
						ret[0].push( point.lat );
						ret[1].push( point.lng );
						return ret;
					}, [ [], [] ] );

					const north = Math.max( ...latitudes );
					const south = Math.min( ...latitudes );
					const west = Math.min( ...longitudes );
					const east = Math.max( ...longitudes );

					this.map.fitBounds( south, west, north, east );
				}
			} );
		}

		this.events.dispatchEvent(new Event('timerangechanged'));
	}

	/**
	 * Удалить теплоход с карты.
	 * @param {string} id - ID теплохода.
	 * @returns {void}
	 */
	removeShip({id}: {id: string}): void {
		if (!this._ships.has( id )) return;
		const shipMarker = this._ships.get( id );
		this._ships.delete( id );
		this.updateShipsCounter();

		shipMarker.remove();
		this.events.dispatchEvent(new Event('timerangechanged'));
	}

	/**
	 * Принудительно отметить места на карте.
	 * @param {Location[]} places - список мест или стоянок (см. {@link module:state/api api}).
	 * @returns {void}
	 * @description В обычном режиме работы на карте отображаются только те места, которые связаны
	 * с текущими круизами активного теплохода. Этот метод позволяет добавить на карту любые маркеры
	 * мест в режиме показа мест или стоянок.
	 */
	forceShowPlaces( places: Location[] ) {
		if (places?.length) {
			const latitudes = [];
			const longitudes = [];

			for (const place of places) {
				const { id, type, category, lat, lng } = place;
				this.attachLocationMarker(
					id, type, category ?? '', lat, lng,
					() => CruiseAssets.locationPopup( place, this ),
				);
				latitudes.push( lat );
				longitudes.push( lng );
			}

			const north = Math.max( ...latitudes );
			const south = Math.min( ...latitudes );
			const west = Math.min( ...longitudes );
			const east = Math.max( ...longitudes );

			this.map.fitBounds( south, west, north, east );
		}
	}

	/**
	 * Разместить корабли на стоянке.
	 * @param {string} coord - координаты стоянки в виде строки.
	 * @param {SVGElement} icon - значок маркера теплохода.
	 * @param {boolean} atStop - теплоход находится на стоянке.
	 * @returns {void}
	 * @description Этот метод располагает маркеры кораблей в ряд, когда они находятся на одной
	 * стоянке. Вызывается при входе теплохода на стоянку и при выходе с неё.
	 */
	checkStoppedShips( coord: string, icon: SVGElement, atStop: boolean ) {
		if (atStop) {
			( this.stoppedShips[ coord ] ??= [] ).push( icon );
		}
		else {
			icon.style.removeProperty( '--cruise-map__marker_intersection-index' );
			if (this.stoppedShips[ coord ]) {
				const el = this.stoppedShips[ coord ].indexOf( icon );
				if (el >= 0) this.stoppedShips[ coord ].splice( el, 1 );
			}
		}

		if (this.stoppedShips[ coord ]) {
			const halfCount = this.stoppedShips[ coord ].length / 2 - 0.5;
			this.stoppedShips[ coord ].forEach( ( icon, index ) => {
				icon.style.setProperty(
					'--cruise-map__marker_intersection-index',
					`${index - halfCount}`,
				);
			} );
		}
	}
}

/**
 * Маркер места, стоянки или шлюза.
 */
class LocationMarker implements InteractiveMapMarker {

	declare icon: InteractiveMapMarker['icon'];
	declare lat: number;
	declare lng: number;
	declare popupContent: InteractiveMapMarker['popupContent'];

	iconSize: [number, number] = [33, 33];
	events = new TypedEventTarget();

	/**
	 * Создаёт экземпляр LocationMarker.
	 * @param {(0|1|2)} locationType - Тип объекта (см. {@link module:state/api api}).
	 * @param {string} locationCategory - Категория объекта (только для достопримечательностей,
	 *                 для стоянок и шлюзов игнорируется).
	 * @param {number} lat - Географическая широта.
	 * @param {number} lng - Географическая долгота.
	 * @param {Promise} popupContent - Промис, возвращающий всплывающее окно (см. {@link module:components/map map}).
	 */
	constructor(
		locationType: LocationType,
		locationCategory: string,
		lat: number,
		lng: number,
		popupContent: InteractiveMapMarker['popupContent'],
	) {
		const markerType = 'cruise-map__marker_type_' + (
			locationType === LocationType.REGULAR ? 'stop' :
			locationType === LocationType.GATEWAY ? 'gateway' :
			'place'
		);
		const iconString =
			locationType === LocationType.REGULAR ? stopMarkerIcon :
			locationType === LocationType.GATEWAY ? gatewayMarkerIcon :
			categorizedMarkers[ locationCategory ] ?? pillarMarkerIcon;

		if (iconString.startsWith( '<svg' )) {
			this.icon = svgAsset( iconString, 'cruise-map__marker', markerType );
		}
		else {
			const icon = this.icon = document.createElement( 'img' );
			icon.src = iconString;
			icon.classList.add( 'cruise-map__marker', markerType );
		}

		this.lat = lat;
		this.lng = lng;
		this.popupContent = popupContent;
	}

}

/**
 * Объект, управляющий отображением на карте маркера теплохода и связанной с ним информации.
 */
class ShipMarker implements InteractiveMapMarker {

	declare private map: CruiseMap;

	declare datetime: Date;
	declare lat: number;
	declare lng: number;
	declare popupContent: InteractiveMapMarker['popupContent'];
	declare marker: Marker | undefined;
	declare activeCruise: Cruise | undefined;
	declare isHover: boolean;
	declare _isDeleted: boolean;

	_atStop: string = '';
	cruises: Cruise[] = [];

	icon = svgAsset(
		linerMarkerIcon,
		'cruise-map__marker', 'cruise-map__marker_type_ship',
	);
	iconSize: [number, number] = [33, 33];
	events = new TypedEventTarget();

	declare ship: Ship;
	private rotateAngle = 0;

	/**
	 * Создаёт экземпляр ShipMarker.
	 * @param {CruiseMap} map - Объект карты.
	 * @param {Ship} ship - Объект данных теплохода (см. {@link module:state/api api}).
	 * @param {Company} company - Объект данных круизной компании (см. {@link module:state/api api}).
	 * @param {Date} datetime - Текущее время на карте.
	 */
	constructor(
		map: CruiseMap,
		ship: Ship,
		company: Company,
		datetime: Date
	) {
		this.icon.style.setProperty(
			'--cruise-map__marker_color',
			`#${company.color.toString(16)}`
		);
		this.map = map;
		this.ship = ship;
		this.popupContent = () => this.shipPopup();
		this.move( datetime );
	}

	/**
	 * Создать всплывающее окно.
	 * @returns {Promise} Промис, возвращающий всплывающее окно.
	 * @description Асинхронный метод, возвращающий DOM элемент с информацией о теплоходе.
	 */
	private async shipPopup() {
		const descriptionElements = this.cruises.map( cruise => {
			const {
				departure = null,
				arrival = null,
				departureLocationName = '',
				arrivalLocationName = '',
				url = ''
			} = cruise;

			return LocatedItemDescriptionRow.create([
				LocatedItemDescriptionButton.create(
					LocatedItemDescriptionRange.create(...([
						departure, arrival
					]).map(value =>
						value?.toLocaleDateString(undefined, {
							day: '2-digit',
							month: '2-digit',
						}) ?? ''
					) as [string, string]),
					() => { url && window.open( url ); }
				),
				...(departureLocationName && arrivalLocationName ? [
					LocatedItemDescriptionRange.create(
						departureLocationName, arrivalLocationName,
						'located-item-description__route'
					)
				] : [])
			], LocatedItemDescriptionGap.MEDIUM, 'top')
		} );
		const {name} = this.ship;
		const {name: companyName, color} = this.ship.company;
		const itemDescription = LocatedItemDescription.create([
			LocatedItemDescriptionGroup.create([
				LocatedItemDescriptionRow.create([
					LocatedItemDescriptionIcon.create(svgAsset(
						linerIcon,
						'cruise-map__icon', 'cruise-map__icon_type_ship',
					)),
					LocatedItemDescriptionText.create(name, [ 'cruise-map__ship-name' ], { title: true } ),
				], LocatedItemDescriptionGap.SMALL),
				LocatedItemDescriptionText.create(companyName),
				LocatedItemDescriptionGroup.create([
					LocatedItemDescriptionIcon.create(svgAsset(
						linersIcon,
						'cruise-map__icon', 'cruise-map__icon_type_ship',
					)),
					...descriptionElements
				], LocatedItemDescriptionGap.SMALL)
			], LocatedItemDescriptionGap.LARGE),
		], ['cruise-map__popup', 'ship-popup'], {
			'--cruise-map__popup_company-color': `#${color.toString(16)}`
		});
		return itemDescription.domNode;
	}

	/**
	 * Переместить теплоход.
	 * @param {Date} datetime - текущее время карты.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод. Изменяет координаты и угол поворота маркера теплохода
	 * на точку в пути в указанное время, а также обновляет на карте круизы, выполняемые теплоходом
	 * в указанное время, и всю связанную с ними информацию.
	 */
	async move(datetime: Date): Promise<void> {
		this.datetime = datetime;
		const cruises = this.ship.cruisesOn( datetime );
		const cruise = this.ship.cruiseOn( datetime );
		if (!cruise?.routeReadyStage) this._removeMarker();

		for (const cruise of this.cruises) {
			if (!cruises.includes( cruise )) {
				this.map.removeCruise( cruise.id );
			}
		}
		for (const cruise of cruises) {
			if (!this.cruises.includes( cruise )) {
				this.map.addCruise( cruise );
			}
		}
		this.cruises = cruises;

		if (cruise !== this.activeCruise) {
			const activeCruise = this.map.cruiseAsset( this.activeCruise?.id );
			if (activeCruise) {
				activeCruise.setHighPriorityLoading( false );
				activeCruise.hideTrack();
			}
			this.activeCruise = cruise;
			if (cruise) {
				this.map.cruiseAsset( cruise.id )?.loadTrackProgressive();
			}
			this.map.updateShipsCounter();
		}

		if (this === this.map.selectedShip) {
			for (const cruise of cruises) {
				this.map.cruiseAsset( cruise.id )?.showAll();
			}
			const activeCruise = this.map.cruiseAsset( this.activeCruise?.id );
			if (activeCruise) {
				activeCruise.setHighPriorityLoading( true );
			}
		}

		if (cruise) {
			let {lat, lng, angle, isStop} = await this.ship.positionAt( datetime );
			if (!this._isDeleted && datetime === this.datetime) {      // Выполняем только последнее запрошенное перемещение
				if (lat === this.lat && lng === this.lng)
					return;

				if (!lat || !lng) {
					lat = 0;
					lng = 0;
					angle = null;
					isStop = false;
				}

				const stopCoords = isStop ? `${lat.toFixed(4)},${lng.toFixed(4)}` : '';
				if (!!this._atStop !== isStop || ( isStop && stopCoords !== this._atStop )) {
					if (this._atStop) this.map.checkStoppedShips( this._atStop, this.icon, false );
					if (isStop) {
						this.map.checkStoppedShips( stopCoords, this.icon, true );
						this._atStop = stopCoords;
					}
					else {
						this._atStop = '';
					}
				}

				this.lat = lat;
				this.lng = lng;

				this.rotateAngle = ( ( angle ?? 90 ) - 90 ) / 360;
				this.rotate();

				if (lat && lng) {
					if (!this.marker) {
						this._createMarker();
					}
					else {
						if (this.isHover || this === this.map.selectedShip ) {
							this.map.cruiseAsset( this.activeCruise?.id )?.showTrack( this.marker );
						}
					}
					if (this !== this.map.selectedShip) {
						if (this._atStop) this.marker?.setZIndexOffset( -1000 );
						else this.marker?.setZIndexOffset( 0 );
					}
				}
				else if (this.marker) {
					this._removeMarker();
				}

				this.events.dispatchEvent(new Event('locationchange'));
			}
		}
		else {
			this.lat = 0;
			this.lng = 0;
			this.rotateAngle = 0;
		}
	}

	/**
	 * Сделать теплоход активным.
	 * @returns {void}
	 */
	activate() {
		if (this.map.selectedShip !== this) {
			this.icon.classList.add( 'active' );
			this.marker?.setZIndexOffset( 10000 );
			if (!!this.map.selectedShip) this.map.selectedShip.deactivate();
			this.map.selectedShip = this;
			for (const cruise of this.cruises) {
				this.map.cruiseAsset( cruise.id ).showAll();
			}
			if (this.marker) {
				const activeCruise = this.map.cruiseAsset( this.activeCruise?.id );
				if (activeCruise) {
					activeCruise.setHighPriorityLoading( true );
					activeCruise.showTrack( this.marker );
				}
			}
		}
	}

	/**
	 * Сделать теплоход неактивным.
	 * @returns {void}
	 */
	deactivate() {
		if (this.map.selectedShip === this) {
			this.icon.classList.remove( 'active' );
			this.marker?.setZIndexOffset( 0 );
			this.map.selectedShip = undefined;
			for (const cruise of this.cruises) {
				this.map.cruiseAsset( cruise.id ).hideAll();
			}
			const activeCruise = this.map.cruiseAsset( this.activeCruise?.id );
			if (activeCruise) {
				activeCruise.setHighPriorityLoading( false );
			}
		}
	}

	/**
	 * Очистить данные при удалении теплохода с карты.
	 * @returns {void}
	 */
	remove() {
		this.deactivate();
        for (const cruise of this.cruises) {
            this.map.removeCruise( cruise.id );
        }
		this._removeMarker();
		this._isDeleted = true;
	}

	/**
	 * Повернуть маркер теплохода.
	 * @returns {void}
	 */
	private rotate(): void {
		this.icon.style.setProperty(
			'--cruise-map__marker_angle',
			`${this.rotateAngle}turn`,
		);
	}

	/**
	 * Создать маркер теплохода.
	 * @returns {void}
	 * @description Для внутреннего использования.
	 */
	_createMarker(): void {
		if (!this.marker) {
			this.map.addInteractiveMarker( 'ship', this );
			if (this.activeCruise && this === this.map.selectedShip ) {
				this.map.cruiseAsset( this.activeCruise.id ).showTrack( this.marker );
				this.icon.classList.add( 'active' );
				this.marker?.setZIndexOffset( 10000 );
			}

			let timer: ReturnType<typeof setTimeout>;
			const onMouseOver = () => {
				if (timer) {
					clearTimeout( timer );
					timer = undefined;
				}
				if (!this.isHover) {
					if (this.activeCruise) {
						const cruise = this.map.cruiseAsset( this.activeCruise.id );
						cruise?.showTrack( this.marker );
					}
					this.isHover = true;
				}
			};
			const onMouseOut = () => {
				if (this.isHover && !timer) {
					timer = setTimeout( () => {
						if (this.isHover) {
							if (this.activeCruise && this.map.selectedShip !== this) {
								const cruise = this.map.cruiseAsset( this.activeCruise.id );
								cruise?.hideTrack();
							}
							this.isHover = false;
						}
						timer = undefined;
					}, 300 );
				}
			};
			this.marker.on( 'mouseover', onMouseOver );
			this.marker.on( 'mouseout', onMouseOut );
			let popupContainer: HTMLElement;
			this.marker.on( 'popupopen', () => {
				const popup = this.marker.getPopup();
				if (popup) {
					popupContainer = popup.getElement();
					if (popupContainer) {
						popupContainer.addEventListener( 'mouseover', onMouseOver );
						popupContainer.addEventListener( 'mouseout', onMouseOut );
					}
				}
			} );
			this.marker.on( 'popupclose', () => {
				if (popupContainer) {
					popupContainer.removeEventListener( 'mouseover', onMouseOver );
					popupContainer.removeEventListener( 'mouseout', onMouseOut );
				}
				onMouseOut();
			} );
			if (this.map.mapMode !== 'cruise') {
				this.marker.on( 'click', () => {
					if (this.map.selectedShip !== this) this.activate();
					else this.deactivate();
				} );
			}
		}
	}

	/**
	 * Удалить маркер теплохода.
	 * @returns {void}
	 * @description Для внутреннего использования.
	 */
	_removeMarker() {
		if (this.marker) {
			if (this.activeCruise) {
				const cruise = this.map.cruiseAsset( this.activeCruise.id );
				cruise?.hideTrack();
			}
			if (this._atStop) this.map.checkStoppedShips( this._atStop, this.icon, false );
			this.map.removeMarker( 'ship', this );
		}
	}
}

/**
 * Объект, управляющий отображением на карте информации, связанной с отдельным круизом.
 */
class CruiseAssets {
	declare map: CruiseMap;
	declare cruise: Cruise;
	declare polyline?: InteractiveMapPolyline | undefined;
	declare _isDeleted: boolean;
	_trackVisible: boolean = false;
	stops: Record<string, InteractiveMapMarker> = {};
	_stopsVisible: boolean = false;
	sights: Record<string, InteractiveMapMarker> = {};
	_sightsVisible: boolean = false;
	sunsets: InteractiveMapMarker[] = [];
	_sunsetsVisible: boolean = false;
	sunrises: InteractiveMapMarker[] = [];
	_sunrisesVisible: boolean = false;
	gateways: Record<string, InteractiveMapMarker> = {};
	_gatewaysVisible: boolean = false;

	/**
	 * Создаёт экземпляр CruiseAssets.
	 * @param {CruiseMap} map - Объект карты.
	 * @param {Cruise} cruise - Объект данных круиза (см. {@link module:state/api api}).
	 */
	constructor( map: CruiseMap, cruise: Cruise ) {
		this.map = map;
		this.cruise = cruise;
	}

	/**
	 * Установить приоритет загрузки трека круиза.
	 * @param {boolean} highPriority - Высокий приоритет загрузки.
	 * @returns {void}
	 */
	setHighPriorityLoading( highPriority: boolean ) {
		this.cruise.setHighPriorityLoading( highPriority );
	}

	/**
	 * Прогрессивная загрузка трека круиза.
	 * @returns {Promise} Пустой промис.
	 * @description Для ускорения вывода круизов на карту точки треков загружаются в четыре этапа.
	 * Этот метод запускает очередной этап загрузки.
	 */
	async loadTrackProgressive() {
		const route = await this.cruise.route;
		if (!this._isDeleted && this.cruise.routeReadyStage > 0 && this.cruise.routeReadyStage < 4) {
			const highPriority = this.cruise === this.map.selectedShip?.activeCruise;
			await this.cruise.loadTrackProgressive( highPriority )
			if (this.polyline) {
				const points = route.points.map(({lat, lng}) => ({lat, lng}));
				if (this._trackVisible) this.map.clearPolyline( 'track', this.polyline );
				this.polyline.points = points;
				if (this._trackVisible) this.map.drawPolyline( 'track', this.polyline );
			}
			const ship = this.map.shipMarker( this.cruise.ship.id );
			if (ship) ship.move( this.map.timelinePoint );
			if (!this._isDeleted && this.cruise.routeReadyStage < 4) this.loadTrackProgressive();
		}
	}

	/**
	 * Очистить данные при удалении круиза с карты.
	 * @returns {void}
	 */
	remove() {
		this.hideAll();
		this.cruise.cancelLoadTrack();
		this._isDeleted = true;
	}

	/**
	 * Показать на карте все маркеры объектов, связанных с круизом, на всех активных слоях.
	 * @returns {void}
	 */
	showAll() {
		for (const layer of [ 'sunsets', 'sunrises', 'gateways', 'stops', 'sights' ]) {
			const ucLayer = layer[0].toUpperCase() + layer.slice(1);
			const mapLayer: VisibilityControl = ( this.map as any )[ `${layer}Layer` ];
			if (mapLayer.visible) {
				( this as any )[ `show${ucLayer}`]();
			}
		}
	}

	/**
	 * Очистить на карте все маркеры объектов, связанных с круизом.
	 * @returns {void}
	 */
	hideAll() {
		for (const layer of [ 'Track', 'Sunsets', 'Sunrises', 'Gateways', 'Stops', 'Sights' ]) {
			( this as any )[ `hide${layer}` ]();
		}
	}

	/**
	 * Показать на карте трек круиза.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод.
	 */
	async showTrack( marker: Marker ) {
		if (this._trackVisible) return;
		this._trackVisible = true;

		if (!this.polyline) {
			const company = this.cruise.company;

			const points = ( await this.cruise.route ).points.map(({lat, lng}) => ({lat, lng}));
			this.polyline = {
				points,
				color: company.color,
				events: {}
			};
		}
		this.polyline.events = {
			'mouseover mouseout click'( event ) {
				marker.fire( event.type, event );
			}
		}
		this.map.drawPolyline( 'track', this.polyline );

		if (this.cruise === this.map.selectedShip?.activeCruise) {
			if (this.map.sunrisesLayer.visible) {
				this.showSunrises();
			}
			if (this.map.sunsetsLayer.visible) {
				this.showSunsets();
			}
		}
	}

	/**
	 * Удалить с карты трек круиза.
	 * @returns {void}
	 */
	hideTrack() {
		if (this._trackVisible) {
			this._trackVisible = false;
			if (this.polyline) {
				this.map.clearPolyline( 'track', this.polyline );
			}
			this.hideSunrises();
			this.hideSunsets();
		}
	}

	/**
	 * Создать всплывающее окно.
	 * @returns {Promise} Промис, возвращающий всплывающее окно.
	 * @description Асинхронный метод, возвращающий DOM элемент с информацией о стоянке или
	 * достопримечательности.
	 */
	static async locationPopup( stop: Location, map: CruiseMap ): Promise<Element> {
		//~ const {lat, lng, type, name, category, description, image, link } = stop;
		const {lat, lng, type, name, category, image, link } = stop;
		//~ const arrival;
		const cruise = map.selectedShip?.activeCruise;
		const cruiseLocations = cruise ? await cruise[ type === LocationType.SHOWPLACE ? 'sights' : 'stops' ] : [];
		const company = cruiseLocations.some( item => item.location === stop ) ? cruise.company : undefined;
		const color = company?.color ?? defaultCompanyColor;
		const imageElements = image ? [
			LocatedItemDescriptionImage.create(image),
		] : [];
		const categoryNameElements = category ? [
			LocatedItemDescriptionText.create(category),
		] : [];
		//~ const descriptionElement = LocatedItemDescriptionText.create(description);
		const itemDescription = LocatedItemDescription.create(
			type === LocationType.SHOWPLACE ? [
				...imageElements,
				LocatedItemDescriptionGroup.create([
					LocatedItemDescriptionRow.create([
						LocatedItemDescriptionIcon.create(svgAsset(
							categorizedIcons[ category ] ?? pillarIcon,
							'cruise-map__icon', 'cruise-map__icon_type_showplace',
						)),
						LocatedItemDescriptionText.create(name, undefined, { title: true }),
					], LocatedItemDescriptionGap.SMALL),
					...categoryNameElements,
					LocatedItemDescriptionButton.create(
						map.text.GO_TO_PLACE,
						() => {
							link && window.open( link );
						},
					),
					LocatedItemDescriptionLocation.create(lat, lng),
					//~ descriptionElement,
				], LocatedItemDescriptionGap.MEDIUM),
			] : [
				...imageElements,
				LocatedItemDescriptionGroup.create([
					LocatedItemDescriptionRow.create([
						LocatedItemDescriptionIcon.create(svgAsset(
							stopIcon,
							'cruise-map__icon', 'cruise-map__icon_type_stop',
						)),
						LocatedItemDescriptionText.create(name, undefined, { title: true }),
					], LocatedItemDescriptionGap.SMALL),
					LocatedItemDescriptionButton.create(
						map.text.GO_TO_TRACKSTOP,
						() => {
							link && window.open( link );
						},
					),
					LocatedItemDescriptionLocation.create(lat, lng),
					//~ descriptionElement,
				], LocatedItemDescriptionGap.LARGE),
			],
			['cruise-map__popup'],
			{
				'--cruise-map__popup_company-color': `#${color.toString(16)}`
			}
		);
		//~ if (imageElements?.length) {
			//~ await Promise.all( imageElements.map( image => image.load() ) );
		//~ }
		for (const image of imageElements) {
			image.load();
		}
		return itemDescription.domNode;
	}

	/**
	 * Создать всплывающее окно.
	 * @returns {Promise} Промис, возвращающий всплывающее окно.
	 * @description Асинхронный метод, возвращающий DOM элемент с информацией о восходе или закате.
	 */
	private static async sunriseSunsetPopup( type: 'sunrise' | 'sunset', point: TrackPoint, map: CruiseMap ): Promise<Element> {
		const {lat, lng, arrival, side} = point;
		const title = type === 'sunset' ? 'Закат' : 'Восход';
		const icon = type === 'sunset' ? sunsetIcon : sunriseIcon;
		const itemDescription = LocatedItemDescription.create(
			[
				LocatedItemDescriptionText.create(title, undefined, { title: true }),
				LocatedItemDescriptionIcon.create(svgAsset(
					icon,
					'cruise-map__icon'
				)),
				LocatedItemDescriptionText.create( arrival.toLocaleString( undefined, {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour12: false,
						hour: '2-digit',
						minute: '2-digit'
					} )
				),
				...( side ? [ LocatedItemDescriptionText.create( side == 'left' ? 'С левой стороны борта' : 'С правой стороны борта' ) ] : [] ),
			],
			['cruise-map__popup'],
			{}
		);
		return itemDescription.domNode;
	}

	/**
	 * Создать всплывающее окно.
	 * @returns {Promise} Промис, возвращающий всплывающее окно.
	 * @description Асинхронный метод, возвращающий DOM элемент с информацией о шлюзе.
	 */
	private static async gatewayPopup( gateway: Location, map: CruiseMap ): Promise<Element> {
		const {lat, lng, name} = gateway;
		const activeCruise = map.selectedShip?.activeCruise;
		const points = ( await activeCruise?.gateways )
			?.filter( item => item.location === gateway );
		const itemDescription = LocatedItemDescription.create(
			[
				LocatedItemDescriptionText.create(name, undefined, { title: true }),
				LocatedItemDescriptionIcon.create(svgAsset(
					gatewayMarkerIcon,
					'cruise-map__icon'
				)),
				...(
					points?.length > 0 ?
						points.map( point =>
							LocatedItemDescriptionText.create( point.arrival.toLocaleString( undefined, {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour12: false,
									hour: '2-digit',
									minute: '2-digit'
								} )
							)
						) :
						[]
				)
			],
			['cruise-map__popup'],
			{}
		);
		return itemDescription.domNode;
	}

	/**
	 * Показать стоянки.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод, размещает на карте маркеры стоянок.
	 */
	async showStops() {
		if (!this._stopsVisible && this.map.selectedShip?.cruises.includes( this.cruise )) {
			this._stopsVisible = true;
			const stops = await this.cruise.stops;
			if (this._stopsVisible) {
				for (const stop of stops) {
					const { id, lat, lng } = stop.location;
					if (id && !this.stops[ id ]) {
						this.stops[ id ] = this.map.attachLocationMarker(
							id, LocationType.REGULAR, '', lat, lng,
							() => CruiseAssets.locationPopup( stop.location, this.map ),
						);
					}
				}
			}
		}
	}
	/**
	 * Скрыть стоянки.
	 * @returns {void}
	 * @description Удаляет маркеры стоянок.
	 */
	hideStops() {
		this._stopsVisible = false;
		for (const id of Object.keys( this.stops )) {
			this.map.detachLocationMarker( id, LocationType.REGULAR );
			delete this.stops[ id ];
		}
	}

	/**
	 * Показать достопримечательности.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод, размещает на карте маркеры достопримечательностей.
	 */
	async showSights() {
		if (!this._sightsVisible && this.map.selectedShip?.cruises.includes( this.cruise )) {
			this._sightsVisible = true;
			const sights = await this.cruise.sights;
			if (this._sightsVisible) {
				for (const sight of sights) {
					const { id, category, lat, lng } = sight.location;
					if (id && !this.sights[ id ]) {
						this.sights[ id ] = this.map.attachLocationMarker(
							id, LocationType.SHOWPLACE, category, lat, lng,
							() => CruiseAssets.locationPopup( sight.location, this.map ),
						);
					}
				}
			}
		}
	}
	/**
	 * Скрыть достопримечательности.
	 * @returns {void}
	 * @description Удаляет маркеры достопримечательностей.
	 */
	hideSights() {
		this._sightsVisible = false;
		for (const id of Object.keys( this.sights )) {
			this.map.detachLocationMarker( id, LocationType.SHOWPLACE );
			delete this.sights[ id ];
		}
	}

	/**
	 * Показать закаты.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод, размещает на карте маркеры закатов.
	 */
	async showSunsets() {
		if (!this._sunsetsVisible && this.cruise === this.map.selectedShip?.activeCruise) {
			this._sunsetsVisible = true;
			const sunsets = await this.cruise.sunsets;
			if (this._sunsetsVisible) {
				sunsets.forEach( point => {
					const sunset: InteractiveMapMarker = {
						lat: point.lat,
						lng: point.lng,
						icon: svgAsset( sunsetIcon, 'cruise-map__icon' ),
						iconSize: [ 24, 24 ],
						events: new TypedEventTarget(),
						popupContent: () => CruiseAssets.sunriseSunsetPopup( 'sunset', point, this.map )
					}
					this.map.addInteractiveMarker( 'sunsets', sunset );
					this.sunsets.push( sunset );
				} );
			}
		}
	}
	/**
	 * Скрыть закаты.
	 * @returns {void}
	 * @description Удаляет маркеры закатов.
	 */
	hideSunsets() {
		this._sunsetsVisible = false;
		this.sunsets.forEach( marker => this.map.removeMarker( 'sunsets', marker ) );
		this.sunsets = [];
	}

	/**
	 * Показать восходы.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод, размещает на карте маркеры восходов.
	 */
	async showSunrises() {
		if (!this._sunrisesVisible && this.cruise === this.map.selectedShip?.activeCruise) {
			this._sunrisesVisible = true;
			const sunrises = await this.cruise.sunrises;
			if (this._sunrisesVisible) {
				sunrises.forEach( point => {
					const sunrise: InteractiveMapMarker = {
						lat: point.lat,
						lng: point.lng,
						icon: svgAsset( sunriseIcon, 'cruise-map__icon' ),
						iconSize: [ 24, 24 ],
						events: new TypedEventTarget(),
						popupContent: () => CruiseAssets.sunriseSunsetPopup( 'sunrise', point, this.map )
					}
					this.map.addInteractiveMarker( 'sunrises', sunrise );
					this.sunrises.push( sunrise );
				} );
			}
		}
	}
	/**
	 * Скрыть восходы.
	 * @returns {void}
	 * @description Удаляет маркеры восходов.
	 */
	hideSunrises() {
		this._sunrisesVisible = false;
		this.sunrises.forEach( marker => this.map.removeMarker( 'sunrises', marker ) );
		this.sunrises = [];
	}

	/**
	 * Показать шлюзы.
	 * @returns {Promise} Пустой промис.
	 * @description Асинхронный метод, размещает на карте маркеры шлюзов.
	 */
	async showGateways() {
		if (!this._gatewaysVisible && this.map.selectedShip?.cruises.includes( this.cruise )) {
			this._gatewaysVisible = true;
			const gateways = await this.cruise.gateways;
			if (this._gatewaysVisible) {
				for (const gateway of gateways) {
					const { id, lat, lng } = gateway.location;
					if (id && !this.gateways[ id ]) {
						this.gateways[ id ] = this.map.attachLocationMarker(
							id, LocationType.GATEWAY, '', lat, lng,
							() => CruiseAssets.gatewayPopup( gateway.location, this.map ),
						);
					}
				}
			}
		}
	}
	/**
	 * Скрыть шлюзы.
	 * @returns {void}
	 * @description Удаляет маркеры шлюзов.
	 */
	hideGateways() {
		this._gatewaysVisible = false;
		for (const id of Object.keys( this.gateways )) {
			this.map.detachLocationMarker( id, LocationType.GATEWAY );
			delete this.gateways[ id ];
		}
	}
}
