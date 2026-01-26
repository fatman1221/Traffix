import React, { useEffect, useRef, useState } from 'react'
import './MapPicker.css'

interface MapPickerProps {
  onLocationSelect: (location: { address: string; lng: number; lat: number }) => void
  initialLocation?: { address: string; lng: number; lat: number }
}

declare global {
  interface Window {
    AMap: any
    initAMap: () => void
  }
}

const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [address, setAddress] = useState(initialLocation?.address || '')
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [error, setError] = useState('')

  // 加载高德地图API
  useEffect(() => {
    // 检查是否已加载
    if (window.AMap) {
      setIsMapLoaded(true)
      return
    }

    // 从环境变量或配置中获取API Key
    const apiKey = import.meta.env.VITE_AMAP_API_KEY || 'a58eb094b2e37f58cdfd92d4b55a269f'

    // 检查是否已经添加了script标签
    const existingScript = document.querySelector(`script[src*="amap.com"]`)
    if (existingScript) {
      // 如果script已存在，等待加载
      const checkAMap = setInterval(() => {
        if (window.AMap) {
          setIsMapLoaded(true)
          clearInterval(checkAMap)
        }
      }, 100)
      return () => clearInterval(checkAMap)
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&callback=initAMap`
    script.async = true
    script.defer = true

    // 定义全局回调
    window.initAMap = () => {
      setIsMapLoaded(true)
    }

    script.onerror = () => {
      setError('地图加载失败，请检查网络连接或API Key配置')
    }

    document.head.appendChild(script)

    return () => {
      // 清理
      if (window.initAMap) {
        delete window.initAMap
      }
    }
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!isMapLoaded || !mapContainer.current || !window.AMap) return

    try {
      const amap = new window.AMap.Map(mapContainer.current, {
        zoom: 13,
        center: initialLocation 
          ? [initialLocation.lng, initialLocation.lat]
          : [116.397428, 39.90923], // 默认北京天安门
        mapStyle: 'amap://styles/normal'
      })

      setMap(amap)

      // 添加初始标记
      if (initialLocation) {
        const initialMarker = new window.AMap.Marker({
          position: [initialLocation.lng, initialLocation.lat],
          map: amap
        })
        setMarker(initialMarker)
        setAddress(initialLocation.address)
      }

      // 地图点击事件
      amap.on('click', (e: any) => {
        const { lng, lat } = e.lnglat

        // 移除旧标记
        if (marker) {
          marker.setMap(null)
        }

        // 添加新标记
        const newMarker = new window.AMap.Marker({
          position: [lng, lat],
          map: amap
        })
        setMarker(newMarker)

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
        if (amap) {
          amap.destroy()
        }
      }
    } catch (err) {
      console.error('地图初始化失败:', err)
      setError('地图初始化失败，请刷新页面重试')
    }
  }, [isMapLoaded, initialLocation])

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
      <div className="map-container" ref={mapContainer}></div>
      {address && (
        <div className="map-address">
          <strong>选中位置：</strong>{address}
        </div>
      )}
      <div className="map-tip">
        💡 点击地图选择位置，或点击左下角定位按钮获取当前位置
      </div>
    </div>
  )
}

export default MapPicker
