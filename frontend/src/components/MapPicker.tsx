import React, { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import './MapPicker.css'

interface MapPickerProps {
  onLocationSelect: (location: { address: string; lng: number; lat: number }) => void
  initialLocation?: { address: string; lng: number; lat: number }
}

declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

function readLngLat(loc: any): { lng: number; lat: number } | null {
  if (!loc) return null
  if (typeof loc.getLng === 'function' && typeof loc.getLat === 'function') {
    return { lng: loc.getLng(), lat: loc.getLat() }
  }
  if (Array.isArray(loc) && loc.length >= 2) {
    return { lng: Number(loc[0]), lat: Number(loc[1]) }
  }
  if (typeof loc.lng === 'number' && typeof loc.lat === 'number') {
    return { lng: loc.lng, lat: loc.lat }
  }
  return null
}

const CAMPUS_POLYGON: Array<[number, number]> = [
  [113.113631, 27.813986],
  [113.095967, 27.813876],
  [113.09585, 27.825669],
  [113.113866, 27.825722],
]

const CAMPUS_BOUNDS = {
  west: Math.min(...CAMPUS_POLYGON.map(([lng]) => lng)),
  east: Math.max(...CAMPUS_POLYGON.map(([lng]) => lng)),
  south: Math.min(...CAMPUS_POLYGON.map(([, lat]) => lat)),
  north: Math.max(...CAMPUS_POLYGON.map(([, lat]) => lat)),
}

const CAMPUS_CENTER: [number, number] = [
  (CAMPUS_BOUNDS.west + CAMPUS_BOUNDS.east) / 2,
  (CAMPUS_BOUNDS.south + CAMPUS_BOUNDS.north) / 2,
]

function isInCampusBounds(lng: number, lat: number) {
  return (
    lng >= CAMPUS_BOUNDS.west &&
    lng <= CAMPUS_BOUNDS.east &&
    lat >= CAMPUS_BOUNDS.south &&
    lat <= CAMPUS_BOUNDS.north
  )
}

function buildReadableAddress(result: any, fallback: string) {
  const regeocode = result?.regeocode
  if (!regeocode) return fallback

  const component = regeocode.addressComponent || {}
  const road = regeocode.roads?.[0]?.name || ''
  const poi = regeocode.pois?.[0]?.name || ''
  const township = component.township || ''
  const district = component.district || ''
  const formatted = regeocode.formattedAddress || ''

  if (road && poi) return `${road}附近（${poi}）`
  if (road) return `${road}附近`
  if (poi) return `湖南工业大学附近（${poi}）`
  if (formatted) return formatted
  return [district, township, '湖南工业大学校内位置'].filter(Boolean).join('') || fallback
}

function resolveAddress(amap: any, lng: number, lat: number, fallback: string, done: (address: string) => void) {
  const requestAddress = () => {
    if (!window.AMap?.Geocoder) {
      done(fallback)
      return
    }

    try {
      const geocoder = new window.AMap.Geocoder({
        city: '株洲',
        radius: 1000,
        extensions: 'all',
      })
      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        const addr =
          status === 'complete' && result?.info === 'OK'
            ? buildReadableAddress(result, fallback)
            : fallback
        done(addr)
      })
    } catch {
      done(fallback)
    }
  }

  try {
    amap.plugin('AMap.Geocoder', requestAddress)
  } catch {
    requestAddress()
  }
}

const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const initialLocationRef = useRef(initialLocation)
  const [address, setAddress] = useState(initialLocation?.address || '')
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchHint, setSearchHint] = useState('')

  // 使用官方 Loader 加载 JS API 2.0，并在加载前注入安全密钥（缺密钥时新版 Key 易报 Unimplemented type 等错误）
  useEffect(() => {
    const apiKey = (import.meta.env.VITE_AMAP_API_KEY || '').trim()
    const securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_JS_CODE || '').trim()

    if (!apiKey) {
      setError('未配置高德 Key：在 frontend/.env 中设置 VITE_AMAP_API_KEY')
      return
    }

    if (window.AMap) {
      setIsMapLoaded(true)
      return
    }

    if (securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode }
    }

    let cancelled = false
    AMapLoader.load({
      key: apiKey,
      version: '2.0',
      plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Geolocation'],
    })
      .then(() => {
        if (cancelled) return
        if (!window.AMap) {
          setError('地图 SDK 异常：未找到 AMap')
          return
        }
        setIsMapLoaded(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setError(
          `地图加载失败：${msg}。若控制台出现 USERKEY_PLAT_NOMATCH，请到高德控制台为该 Key 勾选「Web端(JS API)」，并填写配套的安全密钥 VITE_AMAP_SECURITY_JS_CODE。`
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!isMapLoaded || !mapContainer.current || !window.AMap) return

    try {
      const startLocation = initialLocationRef.current
      const amap = new window.AMap.Map(mapContainer.current, {
        zoom: 16,
        viewMode: '2D',
        pitch: 0,
        center: startLocation
          ? [startLocation.lng, startLocation.lat]
          : CAMPUS_CENTER,
        mapStyle: 'amap://styles/normal',
      })

      mapRef.current = amap

      if (window.AMap.Bounds) {
        const limitBounds = new window.AMap.Bounds(
          [CAMPUS_BOUNDS.west, CAMPUS_BOUNDS.south],
          [CAMPUS_BOUNDS.east, CAMPUS_BOUNDS.north]
        )
        amap.setLimitBounds(limitBounds)
      }

      const campusOverlay = new window.AMap.Polygon({
        path: CAMPUS_POLYGON,
        strokeColor: '#0f766e',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#0f766e',
        fillOpacity: 0.08,
        bubble: true,
      })
      amap.add(campusOverlay)
      amap.setFitView([campusOverlay], false, [28, 28, 28, 28])

      const setMarker = (lng: number, lat: number) => {
        if (markerRef.current) {
          markerRef.current.setMap(null)
        }

        const newMarker = new window.AMap.Marker({
          position: [lng, lat],
          map: amap
        })
        markerRef.current = newMarker
      }

      const selectLocation = (lng: number, lat: number, fallbackName?: string) => {
        if (!isInCampusBounds(lng, lat)) {
          setSearchHint('请选择湖南工业大学校区范围内的位置')
          return
        }

        setMarker(lng, lat)
        setSearchHint('')

        const fallbackAddr = fallbackName || '湖南工业大学校内位置'
        setAddress('正在解析中文地址...')
        onLocationSelect({ address: fallbackAddr, lng, lat })

        resolveAddress(amap, lng, lat, fallbackAddr, (addr) => {
          setAddress(addr)
          onLocationSelect({ address: addr, lng, lat })
        })
      }

      // 地图点击事件
      amap.on('click', (e: any) => {
        const pos = readLngLat(e.lnglat)
        if (pos) {
          selectLocation(pos.lng, pos.lat)
        }
      })

      // 添加初始标记
      if (startLocation && isInCampusBounds(startLocation.lng, startLocation.lat)) {
        setMarker(startLocation.lng, startLocation.lat)
        setAddress(startLocation.address)
      }

      return () => {
        markerRef.current = null
        mapRef.current = null
        if (amap) {
          amap.destroy()
        }
      }
    } catch (err) {
      console.error('地图初始化失败:', err)
      setError('地图初始化失败，请刷新页面重试')
    }
  }, [isMapLoaded])

  const runPlaceSearch = (keyword: string) => {
    const q = keyword.trim()
    if (!q) {
      setSearchHint('请输入要搜索的名称')
      return
    }
    const amap = mapRef.current
    if (!amap || !window.AMap) {
      setSearchHint('地图尚未就绪，请稍候再试')
      return
    }
    setSearchBusy(true)
    setSearchHint('')
    const done = (hint: string) => {
      setSearchBusy(false)
      if (hint) setSearchHint(hint)
    }

    const applyPoi = (poi: any) => {
      const pos = readLngLat(poi?.location)
      if (!pos) {
        done('该结果没有有效坐标')
        return
      }
      const { lng, lat } = pos
      if (!isInCampusBounds(lng, lat)) {
        done('搜索结果不在湖南工业大学校区范围内，请换一个校内地点')
        return
      }
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
      const newMarker = new window.AMap.Marker({
        position: [lng, lat],
        map: amap,
      })
      markerRef.current = newMarker
      amap.setZoomAndCenter(16, [lng, lat])
      const name = (poi.name || q).trim()
      const addrText = poi.address ? `${name}（${poi.address}）` : name
      setAddress(addrText)
      onLocationSelect({ address: addrText, lng, lat })
      done('')
    }

    const trySearch = () => {
      try {
        const PlaceSearch = window.AMap.PlaceSearch
        if (PlaceSearch) {
          const ps = new PlaceSearch({
            city: '株洲',
            citylimit: true,
            pageSize: 10,
          })
          ps.search(q, (status: string, result: any) => {
            if (status === 'complete' && result?.poiList?.pois?.length) {
              applyPoi(result.poiList.pois[0])
              return
            }
            done('未找到相关地点，可换关键词或直接在地图上点击')
          })
          return
        }
      } catch {
        /* fallback below */
      }
      amap.plugin('AMap.PlaceSearch', () => {
        try {
          const ps = new window.AMap.PlaceSearch({
            city: '株洲',
            citylimit: true,
            pageSize: 10,
          })
          ps.search(q, (status: string, result: any) => {
            if (status === 'complete' && result?.poiList?.pois?.length) {
              applyPoi(result.poiList.pois[0])
              return
            }
            done('未找到相关地点，可换关键词或直接在地图上点击')
          })
        } catch {
          done('地点搜索不可用，请检查 Key 是否开通「搜索」相关服务')
        }
      })
    }

    trySearch()
  }

  if (error) {
    return (
      <div className="map-error">
        <div>{error}</div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          提示：如果API Key有问题，可以暂时使用文本输入地点
        </div>
      </div>
    )
  }

  if (!isMapLoaded) {
    return (
      <div className="map-loading">
        <div>正在加载地图...</div>
      </div>
    )
  }

  return (
    <div className="map-picker">
      <div className="map-search-bar">
        <input
          type="text"
          className="map-search-input"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            if (searchHint) setSearchHint('')
          }}
          placeholder="输入地点、道路、商场、小区等名称"
          disabled={searchBusy}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runPlaceSearch(searchText)
            }
          }}
        />
        <button
          type="button"
          className="map-search-btn"
          disabled={searchBusy}
          onClick={() => runPlaceSearch(searchText)}
        >
          {searchBusy ? '搜索中…' : '搜索'}
        </button>
      </div>
      {searchHint ? <div className="map-search-hint">{searchHint}</div> : null}
      <div className="map-container" ref={mapContainer}></div>
      {address && (
        <div className="map-address">
          <strong>选中位置：</strong>{address}
        </div>
      )}
      <div className="map-tip">
        可搜索校内地点或点击湖南工业大学范围内的位置
      </div>
    </div>
  )
}

export default MapPicker
