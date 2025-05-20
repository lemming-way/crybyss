/**
 * @file Обёртка для Leaflet.
 * @module components/map/leaflet
 * @version 1.0.0
 */

import {
  map,
  Map as LMap,
  canvas,
  Renderer,
  TileLayer,
  Layer as LLayer,
  marker,
  Marker,
  DivIcon,
  polyline,
  circleMarker,
  point,
  Point,
  PointExpression,
  LatLngExpression,
  LeafletMouseEvent,
  DomEvent
} from "leaflet";
import "leaflet/dist/leaflet.css";
import Map, {
  Layer,
  MapMarker,
  InteractiveMapMarker,
  MapPolyline,
  InteractiveMapPolyline,
  PointerEvent,
} from ".";
import "./index.css";
import "./leaflet.css";
import * as L from "leaflet";
import "./yandex.js";

/** Класс-обёртка для работы с функциями Leaflet */
export default abstract class LeafletMap extends Map {

  /** URL подложки карты по умолчанию */
  private static readonly TILE_LAYER_URL =
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  /**
   * Слой подложки
   * @type {TileLayer}
   */
  protected tileLayer(): TileLayer {
    return new TileLayer(LeafletMap.TILE_LAYER_URL);
  }

  declare private map: LMap;
  declare private renderer: Renderer;
  private layersCount = 0;
  private autoPan: [Point, Point] = [point(0, 0), point(0, 0)];

  declare mainLayer: Layer;

  /**
   * Создаёт карту.
   * @param {HTMLElement} node - Контейнер карты.
   * @param {LatLngExpression} center - Центр карты.
   * @param {number} zoom - Масштаб карты.
   * @param {(number|null|undefined)} minZoom - Минимальный масштаб карты.
   * @param {(number|undefined)} maxZoom - Максимальный масштаб карты.
   * @description Создаётся карта с функциями измерения расстояний, масштабирования, переключения
   * подложки, координатами курсора, индикатором масштаба. Кнопки для управления этими функциями
   * должны быть созданы отдельно в шаблонах HTML.
   */
  constructor(node: HTMLElement, center: LatLngExpression, zoom: number, minZoom?: number | null, maxZoom?: number) {
    super(node);
    this.map = map(node, {
      center,
      zoom,
      minZoom,
      maxZoom,
      attributionControl: false,
      zoomControl: false,
      renderer: canvas(),
    });
    this.mainLayer = new LeafletPane(this.map, this.autoPan);

    this.tileLayer().addTo(this.map);

    this.map.on("move", () => {
      const { lat, lng } = this.map.getCenter();
      this.events.dispatchEvent(new PointerEvent("pointermove", lat, lng));
    });
    this.map.on("mousemove", ({ latlng: { lat, lng } }) => {
      this.events.dispatchEvent(new PointerEvent("pointermove", lat, lng));
    });

    // линейка начало

    const measurePoints: L.CircleMarker<any>[] = [];
    let measureLine: L.Polyline;

    const removeMeasure = () => {
      measurePoints.forEach((point) => point.remove());
      measurePoints.length = 0;
      measureLine?.remove();
      measureLine = undefined;
    };

    const measureOpenButton = document.querySelector(".map-overlay--line");

    const toggleMeasure = () => {
      measureOpenButton.classList.toggle("active");
      if (!measureOpenButton.classList.contains("active")) {
        removeMeasure();
        this.map.getContainer().style.cursor = "grab";
        this.map.on("dragstart", () => {
          this.map.getContainer().style.cursor = "grabbing";
        });
        this.map.on("dragend", () => {
          this.map.getContainer().style.cursor = "grab";
        });
      } else {
        this.map.getContainer().style.cursor = "crosshair";
      }
    };

    measureOpenButton?.addEventListener("click", toggleMeasure);

    this.map.on("mousedown", () => {
      if (measureLine) {
        removeMeasure();
      }
    });

    this.map.on("click", (event) => {
      if (!measureOpenButton.classList.contains("active")) return;

      var lat = event.latlng.lat;
      var lng = event.latlng.lng;

      const circle = L.circleMarker([lat, lng], {
        radius: 5,
        color: "red",
        fillColor: "red",
        fillOpacity: 1
      }).addTo(this.map);
      measurePoints.push(circle);

      if (measurePoints.length > 1) {
        const lastPoint = measurePoints[measurePoints.length - 2];
        measureLine = L.polyline([lastPoint.getLatLng(), circle.getLatLng()], {
          color: "red",
        }).addTo(this.map);

        const distance = lastPoint.getLatLng().distanceTo(circle.getLatLng());
        const popupContent = `${(distance / 1000).toFixed(2)} км`;
        measureLine
          .bindPopup(popupContent, {
            className: "measure__popup",
          })
          .openPopup();
      }
    });

    // линейка конец
    // курсор начало
    const coordsDiv = L.DomUtil.create("div", "leaflet-control-coords");
    coordsDiv.insertAdjacentHTML(
      "afterbegin",
      `
			<div class="leaflet-control-coords__lat"></div>
			<div class="leaflet-control-coords__lng"></div>
			<div class="leaflet-control-coords__total"></div>
		`
    );
    this.map.getContainer().appendChild(coordsDiv);

    function convertToDMS(coordinate: number, digits: number): string {
      const absolute = Math.abs(coordinate);
      const degrees = Math.floor(absolute);
      const minutesFloat = (absolute - degrees) * 60;
      const minutes = Math.floor(minutesFloat);
      const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
      const secondsFull = seconds.split(".")[0];
      const secondsDecimal = seconds.split(".")[1];

      return `${degrees.toString().padStart(digits, "0")}° ${minutes
        .toString()
        .padStart(2, "0")}' ${secondsFull.padStart(2, "0")}.${secondsDecimal}`;
    }

    const checkCoords = (lat: number, lng: number) => {
      const lngFull = lng.toFixed(4).toString().split(".")[0];
      const lngDecimal = lng.toFixed(4).toString().split(".")[1];
      const coordsLat = document.querySelector(".leaflet-control-coords__lat");
      const coordsLng = document.querySelector(".leaflet-control-coords__lng");
      const coordsTotal = document.querySelector(
        ".leaflet-control-coords__total"
      );
      if (coordsLat && coordsLng && coordsTotal) {
        coordsLat.textContent = `N${convertToDMS(lat, 2)}`;
        coordsLng.textContent = `E${convertToDMS(lng, 3)}`;
        coordsTotal.textContent = `(${lat.toFixed(4)}, ${lngFull.padStart(
          3,
          "0"
        )}.${lngDecimal})`;
      }
    };

    this.map.on("mousemove", (event) => {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      checkCoords(lat, lng);
    });

    const mapCenter = this.map.getCenter();
    checkCoords(mapCenter.lat, mapCenter.lng);
    // курсор конец
    // отрезок начало
    const mileDiv = L.DomUtil.create("div", "leaflet-mile");
    mileDiv.insertAdjacentHTML(
      "afterbegin",
      `
			<div class="leaflet-mile__block leaflet-mile__block_type_km">
				<div class="leaflet-mile__block-marker"></div>
				<div class="leaflet-mile__block-line"></div>
				<div class="leaflet-mile__block-text leaflet-mile__block-text_type_km"></div>
				<div class="leaflet-mile__block-line"></div>
				<div class="leaflet-mile__block-marker"></div>
			</div>
			<div class="leaflet-mile__block leaflet-mile__block_type_mile">
				<div class="leaflet-mile__block-marker"></div>
				<div class="leaflet-mile__block-line"></div>
				<div class="leaflet-mile__block-text leaflet-mile__block-text_type_mile"></div>
				<div class="leaflet-mile__block-line"></div>
				<div class="leaflet-mile__block-marker"></div>
			</div>
		`
    );

    const updateMileWidth = () => {
      const bounds = this.map.getPixelBounds();
      const point1 = point( bounds.min.x + 80, bounds.max.y - 37 );
      const center = this.map.unproject( point1 );
      const distance = center.distanceTo( this.map.unproject( point1.add([ 60, 0 ]) ) );
      const power = Math.pow( 10, Math.floor( Math.log10( distance ) ) );
      const m = Math.ceil( distance / power ) * power;
      const mLength = Math.round( 60 * m / distance );
      const mlLength = Math.round( 60 * m * 1.609344 / distance );
      const mText = m >= 1000 ? `${m/1000} km` : `${m} m`
      const mlText = `${m/1000} ml`;

      const kmBlock = mileDiv.querySelector(".leaflet-mile__block_type_km");
      const mileBlock = mileDiv.querySelector(".leaflet-mile__block_type_mile");
      const kmTextBlock = kmBlock?.querySelector(".leaflet-mile__block-text_type_km");
      const mileTextBlock = mileBlock?.querySelector(".leaflet-mile__block-text_type_mile");

      if (kmBlock && mileBlock && kmTextBlock && mileTextBlock) {
        kmTextBlock.textContent = mText;
        mileTextBlock.textContent = mlText;
        (kmBlock as HTMLElement).style.width = `${mLength}px`;
        (mileBlock as HTMLElement).style.width = `${mlLength}px`;
      }
    };

    this.map.on("moveend zoomend", updateMileWidth);
    updateMileWidth();
    this.map.getContainer().appendChild(mileDiv);
    // отрезок конец
    // подложка начало
    const OSM_TILE_LAYER_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const DGIS_TILE_LAYER_URL = "https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}";
    ("https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}");

    const changeTileLayer = (url: string) => {
      this.map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer || layer instanceof L.Yandex) {
          layer.remove();
        }
      });
      new L.TileLayer(url).addTo(this.map);
    };

    const changeYandexLayer = (type: string) => {
      this.map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer || layer instanceof L.Yandex) {
          layer.remove();
        }
      });
      // @ts-ignore
      const yandexLayer = new L.Yandex(type, {
        apiParams: {
          apikey: "<your API-key>",
        },
      });
      this.map.addLayer(yandexLayer);
    };

    const radioInputs = document.querySelectorAll('input[name="over"]');
    radioInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          switch (target.id) {
            case "over1":
              changeTileLayer(OSM_TILE_LAYER_URL);
              break;
            case "over2":
              changeYandexLayer("map");
              break;
            case "over3":
              changeYandexLayer("satellite");
              break;
            case "over4":
              changeTileLayer(DGIS_TILE_LAYER_URL);
              break;
          }
        }
      });
    });

    // подложка конец
    // блок с кнопками масштабирования начало
    const plusButton = document.querySelector(".map-overlay--zoom-block-button-plus");
    const minusButton = document.querySelector(".map-overlay--zoom-block-button-minus");
    const resetButton = document.querySelector(".map-overlay--zoom-block-button-reset");

    if (plusButton) {
      plusButton.addEventListener("click", () => {
        this.map.zoomIn();
      });
    }

    if (minusButton) {
      minusButton.addEventListener("click", () => {
        this.map.zoomOut();
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            this.map.setView([latitude, longitude]);
          });
        }
      });
    }
    // блок с кнопками масштабирования конец

    const getZoom = () => {
      const zoomLevel = this.map.getZoom();
      ( this.domNode as HTMLElement ).style.setProperty( '--map-zoom', String( zoomLevel ) );
    };
    this.map.on( 'zoomend', getZoom );
    getZoom();
  }

	/**
	 * Разместить и масштабировать карту по заданному прямоугольнику.
   * @param {number} south - Южная граница карты.
   * @param {number} west - Западная граница карты.
   * @param {number} north - Северная граница карты.
   * @param {number} east - Восточная граница карты.
   * @returns {void}
   * @description Карта размещается и масштабируется таким образом, чтобы показывать заданный
   * прямоугольник. От прямоугольника до границ карты оставляется расстояние 20 пикселей.
   * Максимальный масштаб карты ограничен 12, если прямоугольник очень маленький, то он будет
   * отстоять дальше от границ карты.
	 */
  fitBounds( south: number, west: number, north: number, east: number ) {
    // Создаем границы для карты
    const bounds = L.latLngBounds(
      [south, west], // юго-западная точка
      [north, east]  // северо-восточная точка
    );

    // Устанавливаем вид карты по границам с небольшим отступом
    this.map.fitBounds(bounds, {
      padding: [20, 20], // отступ в пикселях со всех сторон
      maxZoom: 12, // ограничиваем максимальное приближение
      animate: true // плавная анимация
    });
  }

  /**
   * Добавить слой на карту.
   * @returns {LeafletPane} Новый слой.
   * @description Создаёт на карте и возвращает новый слой.
   */
  addLayer() {
    return new LeafletPane(
      this.map,
      this.autoPan,
      (this.layersCount++).toString()
    );
  }

  /**
   * Сдвинуть центр карты по указанным координатам.
   * @param {number} lat - Географическая широта.
   * @param {number} lng - Географическая долгота.
   * @returns {void}
   */
  panTo(lat: number, lng: number) {
    this.map.panTo([lat, lng]);
  }

	/**
   * Установка границ, за которые не будут выходить попапы.
   * @param {number} top - расстояние от верхнего края карты.
   * @param {number} right - расстояние от правого края карты.
   * @param {number} bottom - расстояние от нижнего края карты.
   * @param {number} left - расстояние от левого края карты.
   * @returns {void}
   * @description В настоящее время не используется, так как применяется собственный алгоритм
   * размещения попапов на экране.
   */
  setOverlayBounds(top: number, right: number, bottom: number, left: number) {
    this.autoPan[0].x = left;
    this.autoPan[0].y = top;
    this.autoPan[1].x = right;
    this.autoPan[1].y = bottom;
  }

	/**
   * Проекция координат на карту.
   * @param {number} lat - Географическая широта.
   * @param {number} lng - Географическая долгота.
   * @returns {number[]} Координаты внутри DOM объекта карты.
	 * @description Преобразовать географические координаты в экранные координаты относительно
   * контейнера карты.
	 */
  coordsToPoint(lat: number, lng: number): [number, number] {
    const { x, y } = this.map.project([lat, lng], 1);
    return [x, y];
  }
}

/** Реализация слоя с помощью набора панелей */
class LeafletPane<
  TMarker extends MapMarker = MapMarker
> extends Layer<TMarker> {

  declare visible: boolean;

  /**
   * Стандартные панели leaflet, внутри которых будут располагаться панели слоя
   * @type {Set<string>}
   */
  protected static parentPanes: Set<string> = new Set([
    "overlayPane",
    "markerPane",
    "popupPane",
  ]);
  protected get parentPanes(): Set<string> {
    return (this.constructor as typeof LeafletPane).parentPanes;
  }
  declare private paneName: string;

  declare private map: LMap;
  /** Для каждой панели (дочерней для overlayPane) требуется свой Renderer */
  declare private renderer: Renderer;
  /** Точки, задаваемые setOverlayBounds */
  declare private autoPan: [Point, Point];

  /**
   * Соответствия объектов leaflet сущностям приложения
   * @type {WeakMap}
   */
  private representations: WeakMap<TMarker | MapPolyline, LLayer[]> =
    new WeakMap();

  /**
   * Создаёт объект LeafletPane.
   * @param {L.Map} map - Карта Leaflet.
   * @param {Point[]} autoPan - Отступы от края карты для попапов. В настоящий момент не используется.
   * @param {string} paneName - ID слоя.
   */
  constructor(map: LMap, autoPan: [Point, Point], paneName = "") {
    super();
    this.visible = true;

    this.map = map;
    this.autoPan = autoPan;
    this.paneName = paneName;

    if (paneName)
      for (const parentPaneName of this.parentPanes) {
        const pane = map.createPane(
          this.compositePaneName(parentPaneName),
          map.getPane(parentPaneName)
        );
        pane.classList.add("map__layer", "map__layer_visible");
      }
    this.renderer = canvas({
      pane: this.compositePaneName("overlayPane"),
    });
  }

  /**
   * Показать слой на экране.
   * @returns {void}
   */
  show() {
    if (this.visible) return;
    this.visible = true;
    for (const pane of this.panes()) pane.classList.add("map__layer_visible");
    this.events.dispatchEvent(new Event("visibilitychange"));
  }

  /**
   * Скрыть слой на экране.
   * @returns {void}
   */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    for (const pane of this.panes()) {
      pane.classList.remove("map__layer_visible");
    }
    this.events.dispatchEvent(new Event("visibilitychange"));
  }

  /**
   * Переключить видимость слоя.
   * @returns {void}
   */
  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  /**
   * Добавить маркер на карту.
   * @param {MapMarker} - Объект маркера.
   * @returns {void}
   */
  addMarker(mapMarker: TMarker) {
    mapMarker.marker = marker([mapMarker.lat, mapMarker.lng], {
      icon: new DOMIcon({
        html: mapMarker.icon,
        iconSize: mapMarker.iconSize,
      }),
      pane: this.compositePaneName("markerPane"),
    });
    this.syncMarker(mapMarker);
  }

  /**
   * Добавить интерактивный маркер на карту.
   * @param {InteractiveMapMarker} - Объект маркера.
   * @returns {void}
   * @description При клике по интерактивному маркеру открывается всплывающее окно.
   */
  addInteractiveMarker(interactiveMarker: TMarker & InteractiveMapMarker) {
    interface popupMarker extends Marker<any> {
      isOpen?: boolean;
    }
    const lMarker: popupMarker = marker(
      [interactiveMarker.lat, interactiveMarker.lng],
      {
        icon: new DOMIcon({
          html: interactiveMarker.icon,
          iconSize: interactiveMarker.iconSize,
        }),
        pane: this.compositePaneName("markerPane"),
      }
    );
    interactiveMarker.marker = lMarker;
    let timer: ReturnType<typeof setTimeout>;

    // Удаление одноразового маркера
    lMarker.on("popupclose", () => {
      lMarker.unbindPopup();
      lMarker.isOpen = false;
      if (timer) {
        clearTimeout( timer );
        timer = undefined;
      }
    });

    const popupClose = () => {
      if (!timer) {
        timer = setTimeout( () => {
          const popup = lMarker.getPopup();
          if (popup) {
            popup.close();
          }
          timer = undefined;
        }, 300 );
      }
    };

    const onMouseOver = () => {
      if (timer) {
        clearTimeout( timer );
        timer = undefined;
      }
    };

    // Создание и открытие одноразового маркера
    const open = async ( event: LeafletMouseEvent ) => {
      if (!lMarker.isOpen) {
        lMarker.isOpen = true;
        const content = await interactiveMarker.popupContent();

        const contentDiv = document.createElement("div");
        contentDiv.classList.add("map__popup-scroller");
        contentDiv.appendChild( content );
        const popupDiv = document.createElement("div");
        popupDiv.classList.add("map__popup", "map__popup_loaded");
        popupDiv.appendChild( contentDiv );

        // Ищем оптимальное положение попапа
        popupDiv.style.maxWidth = null;
        popupDiv.style.maxHeight = null;
        contentDiv.style.maxWidth = null;
        contentDiv.style.maxHeight = null;
        document.body.appendChild(popupDiv);
        const popupSize = point([ popupDiv.offsetWidth, popupDiv.offsetHeight ]);
        document.body.removeChild(popupDiv);

        const markerCoord = this.map.latLngToContainerPoint( lMarker.getLatLng() );
        const coord = event.sourceTarget === lMarker ? markerCoord : event.containerPoint;
        const size = this.map.getSize();
        const iconSize = point( lMarker.getIcon().options.iconSize );
        const left = coord.x - popupSize.x;
        const right = size.x - coord.x - popupSize.x;
        const top = coord.y - popupSize.y;
        const bottom = size.y - coord.y - popupSize.y;
        const max = Math.max( left, right, top, bottom );

        let offset: PointExpression;
        if (top == max || coord.y >= popupSize.y + 30 + iconSize.y / 2) {
          let x = 0;
          if (size.x - coord.x < popupSize.x / 2 + 20) x = size.x - coord.x - popupSize.x / 2 - 20;
          if (coord.x < popupSize.x / 2 + 20) x = popupSize.x / 2 + 20 - coord.x;
          offset = [ x, -10 - iconSize.y / 2 ];
          if (coord.y - iconSize.y / 2 - popupSize.y < 30) {
            const height = coord.y - iconSize.y / 2 - 30;
            contentDiv.style.maxHeight = `${height - 40}px`;
          }
        }
        else if (left == max) {
          let y = iconSize.y / 2;
          if (coord.y < popupSize.y + 20) y = popupSize.y + 20 - coord.y;
          offset = [ -10 - popupSize.x / 2 - iconSize.x / 2, y ];
          if (coord.x - iconSize.x / 2 - popupSize.x < 30) {
            const width = coord.x - iconSize.x / 2 - 30;
            offset[0] += ( popupSize.x - width ) / 2;
            popupDiv.style.maxWidth = `${width}px`;
          }
        }
        else if (right == max) {
          let y = iconSize.y / 2;
          if (coord.y < popupSize.y + 20) y = popupSize.y + 20 - coord.y;
          offset = [ popupSize.x / 2 + 10 + iconSize.x / 2, y ];
          if (size.x - coord.x - iconSize.x / 2 - popupSize.x < 30) {
            const width = size.x - coord.x - iconSize.x / 2 - 30;
            offset[0] -= ( popupSize.x - width ) / 2;
            popupDiv.style.maxWidth = `${width}px`;
          }
        }
        else {
          let x = 0;
          if (size.x - coord.x < popupSize.x / 2 + 20) x = size.x - coord.x - popupSize.x / 2 - 20;
          if (coord.x < popupSize.x / 2 + 20) x = popupSize.x / 2 + 20 - coord.x;
          offset = [ x, popupSize.y + 10 + iconSize.y / 2 ];
          if (size.y - coord.y - iconSize.y / 2 - popupSize.y < 30) {
            const height = size.y - coord.y - iconSize.y / 2 - 30;
            offset[1] -= popupSize.y - height;
            contentDiv.style.maxHeight = `${height - 40}px`;
          }
        }

        if (coord !== markerCoord) {
          offset[0] += coord.x - markerCoord.x;
          offset[1] += coord.y - markerCoord.y;
        }

        popupDiv.addEventListener('mouseover', onMouseOver);
        popupDiv.addEventListener('mouseout', popupClose);

        lMarker.bindPopup(popupDiv, {
          closeButton: false,
          closeOnClick: false,
          autoPan: false,
          offset,
          pane: this.compositePaneName('popupPane'),
        }).openPopup();
      }
    };

    lMarker.on("mouseover", onMouseOver);

    lMarker.on("mouseover click", ( event: LeafletMouseEvent ) => {
      if (!lMarker.isOpen) open( event );
    });

    lMarker.on("mouseout", popupClose);

    this.syncMarker(interactiveMarker);
  }

  /**
   * Удалить маркер с карты.
   * @param {MapMarker} marker - Объект маркера.
   * @returns {void}
   * @description Работает для простых и интерактивных маркеров.
   */
  removeMarker(marker: TMarker) {
    if (marker.marker) {
      this.removePath(marker);
      marker.marker = undefined;
    }
  }

  /**
   * Связать маркер приложения и маркер leaflet.
   * @param {MapMarker} marker - Объект маркера.
   * @returns {void}
   * @description Добавляет маркер в коллекцию representations.
   */
  private syncMarker(marker: TMarker): void {
    const lMarker = marker.marker;
    this.representations.set(marker, [lMarker]);
    marker.events.addEventListener("locationchange", () => {
      lMarker.setLatLng([marker.lat, marker.lng]);
    });
    lMarker.addTo(this.map);
  }

  /**
   * Нарисовать линию.
   * @param {(MapPolyline|InteractiveMapPolyline)} mapPolyline - Объект линии.
   * @returns {void}
   * @description В данный момент никак не реализован InteractiveMapPolylinePoint.
   */
  drawPolyline(mapPolyline: MapPolyline | InteractiveMapPolyline) {
    if (!this.representations.has( mapPolyline )) {
      const { points } = mapPolyline;
      const color = `#${mapPolyline.color.toString(16)}`;
      const layers: LLayer[] = [
        polyline(points, {
          color,
          weight: 3,
          smoothFactor: 2,
          renderer: this.renderer,
        })
      ];

      if (points.length) {
        for (const { lat, lng } of [ points[0], points[points.length - 1] ]) {
          layers.push(
            circleMarker([lat, lng], {
              color,
              radius: 8,
              stroke: false,
              fill: true,
              fillOpacity: 1,
              renderer: this.renderer,
            })
          );
        }
      }

      if (( mapPolyline as InteractiveMapPolyline ).events) {
        for (const layer of layers) {
          const events = ( mapPolyline as InteractiveMapPolyline ).events;
          for (const type of Object.keys( events )) {
            layer.on( type, events[ type ] );
          }
        }
      }

      this.representations.set(mapPolyline, layers);
      for (const path of layers) path.addTo(this.map);
    }
  }

  /**
   * Удалить линию с карты.
   * @param {MapPolyline} polyline - Объект линии.
   * @returns {void}
   * @description Работает для простых и интерактивных линий.
   */
  clearPolyline(polyline: MapPolyline) {
    if (this.representations.has( polyline )) {
      this.removePath(polyline);
    }
  }

  /**
   * Получить панели слоя.
   * @yields {HTMLElement} DOM-элемент панели.
   */
  private *panes(): Iterable<HTMLElement> {
    for (const parentPaneName of this.parentPanes)
      yield this.map.getPane(this.compositePaneName(parentPaneName));
  }

  private compositePaneName(parentPaneName: string) {
    return this.paneName
      ? `${parentPaneName}-${this.paneName}`
      : parentPaneName;
  }

  private removePath(key: any): void {
    for (const layer of this.representations.get(key) ?? [])
      layer.removeFrom(this.map);
    this.representations.delete(key);
  }
}

/** Иконка с доступом к своему html-элементу */
type ExposedDivIcon = DivIcon & {
  container: HTMLElement;
};

/**
 * Иконка в стилизованном контейнере
 * @class DOMIcon
 */
const DOMIcon = DivIcon.extend({
  createIcon() {
    const div = document.createElement("div");
    div.classList.add("leaflet-marker-icon");
    div.style.setProperty(
      "--leaflet-marker-icon_width",
      `${this.options.iconSize[0]}px`
    );
    div.style.setProperty(
      "--leaflet-marker-icon_height",
      `${this.options.iconSize[1]}px`
    );
    div.appendChild(this.options.html);
    this.container = div;
    return div;
  },
}) as any; // С конструкторами объектов leaflet сложности, поэтому any
