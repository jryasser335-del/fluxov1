import { Download, Smartphone, Shield, Zap, RefreshCw, Play, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DownloadApp = () => {
  const apkDownloadUrl = "https://github.com/TU-USUARIO/fluxotv-releases/releases/latest/download/fluxotv.apk";

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Streaming en Vivo",
      description: "Canales deportivos 24/7"
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Actualización Automática",
      description: "Partidos sincronizados en tiempo real"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "App Segura",
      description: "Instalación directa sin tiendas"
    }
  ];

  const installSteps = [
    "Descarga el archivo APK tocando el botón",
    "Abre el archivo descargado",
    "Si aparece un aviso de seguridad, toca 'Configuración'",
    "Activa 'Permitir desde esta fuente'",
    "Vuelve atrás y toca 'Instalar'",
    "¡Listo! Abre FluxoTV desde tu pantalla de inicio"
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/15 blur-[180px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver</span>
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="max-w-lg w-full space-y-8">
            {/* App icon and title */}
            <div className="text-center space-y-4">
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary via-purple-600 to-accent blur-xl opacity-50" />
                <div className="relative w-full h-full rounded-[2rem] bg-gradient-to-br from-primary via-purple-600 to-accent flex items-center justify-center shadow-2xl">
                  <Play className="w-12 h-12 text-white fill-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-display tracking-wider gradient-text">FluxoTV</h1>
                <p className="text-white/60 mt-1">Versión 1.0.0 • Android</p>
              </div>
            </div>

            {/* Download button */}
            <a
              href={apkDownloadUrl}
              download
              className="group relative block w-full"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-accent blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative flex items-center justify-center gap-3 py-5 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                <Download className="w-6 h-6" />
                Descargar APK
              </div>
            </a>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="glass-panel rounded-2xl p-4 text-center space-y-2"
                >
                  <div className="w-10 h-10 mx-auto rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xs font-semibold text-white">{feature.title}</h3>
                  <p className="text-[10px] text-white/50 leading-tight">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Installation guide */}
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cómo instalar</h2>
                  <p className="text-xs text-white/50">Sigue estos pasos simples</p>
                </div>
              </div>

              <ol className="space-y-3">
                {installSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm text-white/80 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Sync info */}
            <div className="glass-panel rounded-2xl p-4 flex items-center gap-4 border border-green-500/20 bg-green-500/5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sincronización automática</h3>
                <p className="text-xs text-white/60">
                  Los partidos se actualizan automáticamente desde la web a la app en tiempo real
                </p>
              </div>
            </div>

            {/* Note */}
            <p className="text-center text-xs text-white/40">
              Esta app es exclusiva para dispositivos Android. 
              Para iOS, usa la opción "Añadir a pantalla de inicio" en Safari.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DownloadApp;
