import wixWindowFrontend from 'wix-window-frontend';

$w.onReady(function () {

    $w('#repeaterVariedades').onItemReady(($item, itemData) => {

        $item('#btnCopiar').onClick(async () => {

            const referencia = itemData.referencia;

            if (!referencia) {
                return;
            }

            await wixWindowFrontend.copyToClipboard(referencia);

            $item('#btnCopiar').label = 'COPIADO ✓';

            setTimeout(() => {
                $item('#btnCopiar').label = 'COPIAR REFERENCIA';
            }, 1500);

        });

    });

});