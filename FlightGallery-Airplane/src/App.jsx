import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

const destinations = [
  {
    id: 'istanbul',
    city: 'Istanbul',
    label: '伊斯坦布尔',
    code: 'IST',
    flight: '夜航转晨光',
    palette: 'from-sky-100 via-rose-100 to-amber-100',
    photos: [
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1400&q=82'
    ],
    guide: ['清晨去苏丹艾哈迈德广场', '傍晚留给加拉塔桥与海风', '把香料市场放进半日散步线'],
    decision: '适合 3-5 天城市停留；优先选择抵达时间在清晨的航班。'
  },
  {
    id: 'london',
    city: 'London',
    label: '伦敦',
    code: 'LHR',
    flight: '云层下的灰蓝航线',
    palette: 'from-cyan-100 via-slate-100 to-pink-100',
    photos: [
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&w=1400&q=82'
    ],
    guide: ['南岸步行连接泰特现代与伦敦桥', '雨天安排博物馆与书店', '黄昏坐上双层巴士看城市灯线'],
    decision: '适合转机延展与长周末；优先比较直飞价格和机场到市区时间。'
  }
]

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const active = destinations[activeIndex]

  const nextDestination = () => {
    setActiveIndex((index) => (index + 1) % destinations.length)
    setPhotoIndex(0)
  }

  const previousDestination = () => {
    setActiveIndex((index) => (index - 1 + destinations.length) % destinations.length)
    setPhotoIndex(0)
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') nextDestination()
      if (event.key === 'ArrowLeft') previousDestination()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cabinShift = useMemo(() => activeIndex * -42, [activeIndex])

  return (
    <main className={`min-h-svh overflow-hidden bg-gradient-to-br ${active.palette} text-slate-800`}>
      <section className="relative grid min-h-svh place-items-center px-4 py-5 sm:px-6 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.75),transparent_24rem),radial-gradient(circle_at_86%_12%,rgba(111,184,219,0.2),transparent_22rem)]" />
        <div className="cabin-shell relative h-[min(840px,calc(100svh-40px))] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/55 bg-white/30 shadow-cabin backdrop-blur-2xl">
          <motion.div
            className="absolute inset-0"
            animate={{ x: cabinShift }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <CabinInterior />
          </motion.div>

          <div className="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">
            <Header active={active} />

            <div className="grid min-h-0 items-center gap-5 px-5 pb-4 md:grid-cols-[1fr_minmax(360px,440px)] md:px-10 lg:grid-cols-[1fr_minmax(390px,470px)]">
              <WindowGallery
                active={active}
                photoIndex={photoIndex}
                setPhotoIndex={setPhotoIndex}
                onNext={nextDestination}
                onPrevious={previousDestination}
              />
              <InfoPanel active={active} />
            </div>

            <DestinationRail activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
          </div>
        </div>
      </section>
    </main>
  )
}

function Header({ active }) {
  return (
    <header className="relative z-20 flex items-start justify-between gap-4 px-5 py-5 md:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">FlightMyLife</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-slate-800 sm:text-4xl">In-Flight Narrative Gallery</h1>
      </div>
      <div className="rounded-full border border-white/60 bg-white/45 px-4 py-2 text-right shadow-lg shadow-sky-900/5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{active.code}</p>
        <p className="text-sm font-medium text-slate-700">{active.flight}</p>
      </div>
    </header>
  )
}

function CabinInterior() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(171,213,232,0.52),rgba(255,218,224,0.32)_42%,rgba(244,250,252,0.7)_68%,rgba(142,191,221,0.44))]" />
      <div className="absolute left-[-7%] top-[14%] h-[78%] w-[30%] rounded-[42%_36%_18%_18%] bg-gradient-to-r from-sky-400/35 via-sky-200/45 to-rose-100/50 shadow-[inset_-34px_0_60px_rgba(20,80,130,0.18)]" />
      <div className="absolute right-[-8%] top-[8%] h-[86%] w-[33%] rounded-[42%_34%_18%_18%] bg-gradient-to-l from-sky-500/38 via-sky-200/52 to-rose-100/45 shadow-[inset_38px_0_70px_rgba(15,67,115,0.2)]" />
      <div className="absolute bottom-[15%] left-[14%] h-4 w-[28%] rounded-full bg-white/55 shadow-[0_8px_20px_rgba(62,113,145,0.16)]" />
      <div className="absolute bottom-[28%] right-[24%] h-[12%] w-[24%] rounded-lg bg-white/45 shadow-[0_14px_35px_rgba(83,112,132,0.18)]" />
      <div className="absolute bottom-[24%] right-[33%] h-3 w-20 rounded-full bg-amber-200/55" />
      <div className="absolute bottom-[26%] right-[29%] h-12 w-7 rounded-t-full bg-rose-100/70 shadow-[inset_0_8px_18px_rgba(255,255,255,0.8)]" />
    </div>
  )
}

function WindowGallery({ active, photoIndex, setPhotoIndex, onNext, onPrevious }) {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center gap-4">
      <motion.div
        className="relative aspect-[0.78] h-[min(58svh,560px)] min-h-[360px] max-h-[600px] w-auto cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.x < -72) onNext()
          if (info.offset.x > 72) onPrevious()
        }}
      >
        <div className="absolute inset-[-22px] rounded-[46%/30%] bg-white/40 shadow-[inset_0_0_30px_rgba(255,255,255,0.9),0_18px_50px_rgba(48,103,139,0.18)]" />
        <div className="absolute inset-[-10px] rounded-[45%/29%] border border-white/70 bg-gradient-to-b from-white/80 via-sky-50/65 to-sky-200/40 shadow-window" />
        <button
          aria-label="Previous destination"
          className="window-arrow left-[-60px]"
          type="button"
          onClick={onPrevious}
        >
          ‹
        </button>
        <button aria-label="Next destination" className="window-arrow right-[-60px]" type="button" onClick={onNext}>
          ›
        </button>

        <div className="window-mask absolute inset-[18px] overflow-hidden bg-sky-100">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={`${active.id}-${photoIndex}`}
              src={active.photos[photoIndex]}
              alt={`${active.label} architectural photography`}
              className="h-full w-full object-cover"
              initial={{ opacity: 0, x: 70, scale: 1.06, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -70, scale: 1.02, filter: 'blur(8px)' }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),transparent_32%,rgba(7,34,58,0.24))]" />
          <div className="absolute left-1/2 top-0 h-24 w-[74%] -translate-x-1/2 rounded-b-[48%] bg-white/28 backdrop-blur-[1px]" />
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/45 px-3 py-2 backdrop-blur-md">
            {active.photos.map((photo, index) => (
              <button
                aria-label={`Show ${active.label} photo ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === photoIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/55'
                }`}
                key={photo}
                type="button"
                onClick={() => setPhotoIndex(index)}
              />
            ))}
          </div>
        </div>
      </motion.div>
      <p className="rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm text-slate-600 backdrop-blur-lg">
        拖动舷窗、按左右箭头，或点击座位节点切换目的地
      </p>
    </div>
  )
}

function InfoPanel({ active }) {
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={active.id}
        className="rounded-2xl border border-white/60 bg-white/48 p-5 shadow-2xl shadow-sky-900/10 backdrop-blur-2xl md:p-6"
        initial={{ opacity: 0, y: 22, x: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, x: -12, filter: 'blur(8px)' }}
        transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">Window Node</p>
        <h2 className="mt-2 text-4xl font-semibold leading-none text-slate-800">{active.label}</h2>
        <p className="mt-1 text-lg text-slate-500">{active.city}</p>

        <div className="mt-6 space-y-3">
          {active.guide.map((item) => (
            <div className="rounded-xl border border-white/55 bg-white/40 px-4 py-3 text-sm text-slate-700" key={item}>
              {item}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-slate-800/80 p-4 text-white shadow-xl shadow-slate-900/10">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Flight Decision</p>
          <p className="mt-2 text-sm leading-6 text-white/85">{active.decision}</p>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

function DestinationRail({ activeIndex, setActiveIndex }) {
  return (
    <nav className="relative z-20 flex items-center justify-center gap-3 px-5 pb-5">
      {destinations.map((destination, index) => (
        <button
          className={`min-w-36 rounded-full border px-5 py-3 text-left transition duration-500 ease-gallery ${
            index === activeIndex
              ? 'border-white/80 bg-white/70 text-slate-800 shadow-lg shadow-sky-900/10'
              : 'border-white/45 bg-white/25 text-slate-600 backdrop-blur-lg hover:bg-white/45'
          }`}
          key={destination.id}
          type="button"
          onClick={() => setActiveIndex(index)}
        >
          <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">{destination.code}</span>
          <span className="block text-sm font-semibold">{destination.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default App
