// Página: Área de Clientes — v1.0.0
import wixData from 'wix-data';
import wixLocationFrontend from 'wix-location-frontend';

$w.onReady(async () => {
    let cfg;
    try {
        const res = await wixData.query('ConfigArea').limit(1).find();
        cfg = res.items[0];
    } catch (err) {
        console.error('No se pudo leer ConfigArea:', err);
        return;
    }

    if (!cfg) {
        console.error('ConfigArea no tiene ninguna fila.');
        return;
    }

    // Acceder: externa, se abre en pestaña nueva
    $w('#btnAcceder').onClick(() => {
        if (cfg.accessUrl) {
            wixLocationFrontend.to(cfg.accessUrl);
        }
    });

    // Internas: navegación dentro del sitio
    if (cfg.tutorialUrl) { $w('#btnTutorial').onClick(() => wixLocationFrontend.to(cfg.tutorialUrl)); }
    if (cfg.helpUrl)     { $w('#btnAyuda').onClick(() => wixLocationFrontend.to(cfg.helpUrl)); }
    if (cfg.termsUrl)    { $w('#btnTerminos').onClick(() => wixLocationFrontend.to(cfg.termsUrl)); }
});