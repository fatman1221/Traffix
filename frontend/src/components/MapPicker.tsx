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

const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
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
      plugins: ['AMap.PlaceSearch'],
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
      const amap = new window.AMap.Map(mapContainer.current, {
        zoom: 13,
        viewMode: '2D',
        pitch: 0,
        center: initialLocation
          ? [initialLocation.lng, initialLocation.lat]
          : [116.397428, 39.90923],
        mapStyle: 'amap://styles/normal',
      })

      mapRef.current = amap

      // 添加初始标记
      if (initialLocation) {
        const initialMarker = new window.AMap.Marker({
          position: [initialLocation.lng, initialLocation.lat],
          map: amap
        })
        markerRef.current = initialMarker
        setAddress(initialLocation.address)
      }

      // 地图点击事件
      amap.on('click', (e: any) => {
        const { lng, lat } = e.lnglat

        if (markerRef.current) {
          markerRef.current.setMap(null)
        }

        const newMarker = new window.AMap.Marker({
          position: [lng, lat],
          map: amap
        })
        markerRef.current = newMarker

        // 直接使用坐标作为地址（简化处理，避免API调用问题）
        const coordAddr = `经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`
        setAddress(coordAddr)
        onLocationSelect({
          address: coordAddr,
          lng,
          lat
        })
        
        // 尝试获取地址（如果API Key支持，异步处理，不阻塞）
        setTimeout(() => {
          try {
            if (window.AMap && window.AMap.Geocoder) {
              amap.plugin('AMap.Geocoder', () => {
                try {
                  const geocoder = new window.AMap.Geocoder({
                    city: '全国'
                  })
                  geocoder.getAddress([lng, lat], (status: string, result: any) => {
                    if (status === 'complete' && result && result.info === 'OK') {
                      const addr = result.regeocode?.formattedAddress || coordAddr
                      setAddress(addr)
                      onLocationSelect({
                        address: addr,
                        lng,
                        lat
                      })
                    }
                  })
                } catch (err) {
                  // 静默失败，使用坐标
                  console.log('逆地理编码失败，使用坐标')
                }
              })
            }
          } catch (err) {
            // 静默失败
            console.log('逆地理编码不可用')
          }
        }, 100)
      })

      // 定位到当前位置（可选功能，静默失败）
      setTimeout(() => {
        try {
          if (window.AMap && window.AMap.Geolocation) {
            amap.plugin('AMap.Geolocation', () => {
              try {
                const geolocation = new window.AMap.Geolocation({
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0,
                  convert: true,
                  showButton: true,
                  buttonPosition: 'LB',
                  showMarker: true,
                  showCircle: true,
                  panToLocation: true,
                  zoomToAccuracy: true
                })

                amap.addControl(geolocation)

                geolocation.getCurrentPosition((status: string, result: any) => {
                  if (status === 'complete' && result && result.position) {
                    const { lng, lat } = result.position
                    amap.setCenter([lng, lat])
                  }
                })
              } catch (err) {
                console.log('定位功能初始化失败')
              }
            })
          }
        } catch (err) {
          console.log('定位功能不可用')
        }
      }, 200)

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
  }, [isMapLoaded, initialLocation])

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
            city: '全国',
            citylimit: false,
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
            city: '全国',
            citylimit: false,
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
        💡 可搜索名称定位，或点击地图选点，或使用左下角定位按钮
      </div>
    </div>
  )
}

export default MapPicker
