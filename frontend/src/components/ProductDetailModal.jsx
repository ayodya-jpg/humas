import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';

function toImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';

    const path = value.trim();

    if (/^https?:\/\//i.test(path)) return path;

    if (/^(data:|blob:|javascript:|\/\/)/i.test(path)) {
        return '';
    }

    try {
        const origin = new URL(
            api.defaults.baseURL || '/api',
            window.location.origin
        ).origin;

        const cleaned = path.replace(/^\/+/, '');

        const filename = /^(storage\/|uploads\/)/i.test(cleaned)
            ? cleaned
            : /^(products\/|product-images\/)/i.test(cleaned)
                ? `storage/${cleaned}`
                : cleaned;

        return `${origin}/${filename}`;
    } catch {
        return '';
    }
}

function getImages(product) {
    if (!product) return [];

    let gallery = product.gallery_images || [];

    if (typeof gallery === 'string') {
        try {
            gallery = JSON.parse(gallery);
        } catch {
            gallery = [];
        }
    }

    return [
        ...new Set(
            [
                product.image,
                ...(Array.isArray(gallery) ? gallery : []),
            ]
                .map(toImageUrl)
                .filter(Boolean)
        ),
    ];
}

export default function ProductDetailModal({
    open = false,
    product = null,
    onClose,
    serviceName = '',
    onAddToCart,
}) {
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState(false);
    const [failed, setFailed] = useState([]);

    const startTouch = useRef(null);
    const dialogRef = useRef(null);
    const zoomRef = useRef(null);

    const images = useMemo(
        () => getImages(product),
        [product]
    );

    const count = images.length;

    const current =
        images[
            Math.min(
                active,
                Math.max(count - 1, 0)
            )
        ] || '';

    const stock = Math.max(
        0,
        Number(product?.stock) || 0
    );

    const name = product?.name || 'Detail Barang';

    const category =
        product?.category?.name ||
        product?.category_name ||
        'Barang';

    const description =
        product?.description?.trim?.() ||
        'Belum ada deskripsi barang.';

    /*
    |--------------------------------------------------------------------------
    | RESET MODAL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        setActive(0);
        setZoom(false);
        setFailed([]);
    }, [open, product?.id]);

    /*
    |--------------------------------------------------------------------------
    | KUNCI SCROLL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!open || !product) return undefined;

        const previousOverflow =
            document.body.style.overflow;

        const previousFocus =
            document.activeElement;

        document.body.style.overflow = 'hidden';

        dialogRef.current?.focus();

        return () => {
            document.body.style.overflow =
                previousOverflow;

            if (
                previousFocus &&
                typeof previousFocus.focus === 'function'
            ) {
                previousFocus.focus();
            }
        };
    }, [open, product?.id]);

    useEffect(() => {
        if (zoom) {
            zoomRef.current?.focus();
        }
    }, [zoom]);

    /*
    |--------------------------------------------------------------------------
    | NAVIGASI GALERI
    |--------------------------------------------------------------------------
    */

    function next() {
        if (count > 1) {
            setActive(
                (index) => (index + 1) % count
            );
        }
    }

    function previous() {
        if (count > 1) {
            setActive(
                (index) =>
                    (index - 1 + count) % count
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | KEYBOARD
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!open || !product) return undefined;

        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();

                if (zoom) {
                    setZoom(false);
                } else {
                    onClose?.();
                }
            }

            if (
                event.key === 'ArrowRight' &&
                count > 1
            ) {
                event.preventDefault();

                setActive(
                    (index) =>
                        (index + 1) % count
                );
            }

            if (
                event.key === 'ArrowLeft' &&
                count > 1
            ) {
                event.preventDefault();

                setActive(
                    (index) =>
                        (index - 1 + count) % count
                );
            }

            if (event.key === 'Tab') {
                const container = zoom
                    ? zoomRef.current
                    : dialogRef.current;

                if (!container) return;

                const controls = [
                    ...container.querySelectorAll(
                        'button:not(:disabled)'
                    ),
                ];

                if (!controls.length) return;

                const first = controls[0];

                const last =
                    controls[controls.length - 1];

                if (
                    event.shiftKey &&
                    (
                        document.activeElement === first ||
                        document.activeElement === container
                    )
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    (
                        document.activeElement === last ||
                        document.activeElement === container
                    )
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener(
            'keydown',
            onKey
        );

        return () =>
            document.removeEventListener(
                'keydown',
                onKey
            );
    }, [
        open,
        product,
        zoom,
        count,
        onClose,
    ]);

    /*
    |--------------------------------------------------------------------------
    | SWIPE GAMBAR
    |--------------------------------------------------------------------------
    */

    function touchEnd(event) {
        const x =
            event.changedTouches[0]?.clientX;

        if (
            startTouch.current !== null &&
            typeof x === 'number'
        ) {
            const distance =
                x - startTouch.current;

            if (distance < -45) next();

            if (distance > 45) previous();
        }

        startTouch.current = null;
    }

    /*
    |--------------------------------------------------------------------------
    | FOTO PRODUK
    |--------------------------------------------------------------------------
    */

    function picture(isZoom = false) {
        return current && !failed.includes(current) ? (
            <img
                src={current}
                alt={`${name}, foto ${active + 1}`}
                className={
                    isZoom
                        ? 'hum-modal-zoom-image'
                        : 'hum-modal-main-image'
                }
                onError={() =>
                    setFailed((old) => [
                        ...new Set([
                            ...old,
                            current,
                        ]),
                    ])
                }
                draggable={false}
            />
        ) : (
            <div className="hum-modal-empty">
                <i className="bi bi-image fs-1" />

                <span>
                    Foto belum tersedia
                </span>
            </div>
        );
    }

    if (
        !open ||
        !product ||
        typeof document === 'undefined'
    ) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | TAMPILAN MODAL
    |--------------------------------------------------------------------------
    */

    return createPortal(
        <>
            <div
                className="hum-modal-backdrop"
                onMouseDown={(event) => {
                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        onClose?.();
                    }
                }}
            >
                <section
                    ref={dialogRef}
                    className="hum-modal-window"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Detail barang ${name}`}
                    aria-hidden={
                        zoom ? true : undefined
                    }
                    tabIndex={-1}
                >
                    {/* HEADER */}

                    <header className="hum-modal-header">
                        <div>
                            <small>
                                DETAIL BARANG
                                {serviceName
                                    ? ` / ${serviceName}`
                                    : ''}
                            </small>

                            <h2>
                                {name}
                            </h2>
                        </div>

                        <button
                            type="button"
                            className="hum-modal-close"
                            onClick={onClose}
                            aria-label="Tutup detail"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </header>

                    {/* BODY */}

                    <div className="hum-modal-body">
                        {/* GALERI */}

                        <div>
                            <div
                                className="hum-modal-photo"
                                onTouchStart={(event) => {
                                    startTouch.current =
                                        event.touches[0]
                                            ?.clientX ?? null;
                                }}
                                onTouchEnd={touchEnd}
                            >
                                {picture()}

                                {current &&
                                    !failed.includes(current) && (
                                        <button
                                            type="button"
                                            className="hum-modal-zoom-button"
                                            onClick={() =>
                                                setZoom(true)
                                            }
                                        >
                                            <i className="bi bi-arrows-fullscreen me-2" />

                                            Perbesar
                                        </button>
                                    )}

                                {count > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            className="hum-modal-arrow left"
                                            onClick={previous}
                                            aria-label="Foto sebelumnya"
                                        >
                                            <i className="bi bi-chevron-left" />
                                        </button>

                                        <button
                                            type="button"
                                            className="hum-modal-arrow right"
                                            onClick={next}
                                            aria-label="Foto berikutnya"
                                        >
                                            <i className="bi bi-chevron-right" />
                                        </button>
                                    </>
                                )}

                                {count > 0 && (
                                    <span className="hum-modal-counter">
                                        {active + 1} / {count}
                                    </span>
                                )}
                            </div>

                            {/* THUMBNAIL */}

                            {count > 1 && (
                                <div className="hum-modal-thumbnails">
                                    {images.map((src, index) => (
                                        <button
                                            type="button"
                                            key={src}
                                            className={
                                                index === active
                                                    ? 'selected'
                                                    : ''
                                            }
                                            onClick={() =>
                                                setActive(index)
                                            }
                                            aria-label={`Lihat foto ${index + 1}`}
                                        >
                                            {failed.includes(src) ? (
                                                <i className="bi bi-image" />
                                            ) : (
                                                <img
                                                    src={src}
                                                    alt=""
                                                    onError={() =>
                                                        setFailed((old) => [
                                                            ...new Set([
                                                                ...old,
                                                                src,
                                                            ]),
                                                        ])
                                                    }
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <p className="hum-modal-help">
                                Klik Perbesar atau geser foto
                                untuk melihat galeri.
                            </p>
                        </div>

                        {/* DETAIL BARANG */}

                        <div className="hum-modal-details">
                            <div className="hum-modal-tags">
                                <span>
                                    {category}
                                </span>

                                <span
                                    className={
                                        stock
                                            ? 'available'
                                            : 'empty'
                                    }
                                >
                                    {stock
                                        ? 'Tersedia'
                                        : 'Stok Habis'}
                                </span>
                            </div>

                            <h3>
                                {name}
                            </h3>

                            {/* STOK */}

                            <div className="hum-modal-stock">
                                <i className="bi bi-box-seam fs-3" />

                                <div>
                                    <small>
                                        Stok tersedia
                                    </small>

                                    <strong>
                                        {stock.toLocaleString('id-ID')} unit
                                    </strong>
                                </div>
                            </div>

                            {/* DESKRIPSI */}

                            <h4>
                                Deskripsi Barang
                            </h4>

                            <p className="hum-modal-description">
                                {description}
                            </p>

                            {/* INFORMASI */}

                            <p className="hum-modal-note">
                                <i className="bi bi-info-circle me-2" />

                                Informasi dan foto dikelola
                                oleh admin. Ketersediaan akhir
                                mengikuti persetujuan layanan.
                            </p>

                            {/* AKSI */}

                            <div className="hum-modal-actions">
                                {typeof onAddToCart ===
                                    'function' && (
                                    <button
                                        type="button"
                                        className="hum-modal-add"
                                        disabled={stock <= 0}
                                        onClick={() =>
                                            onAddToCart(product)
                                        }
                                    >
                                        <i className="bi bi-cart-plus me-2" />

                                        {stock > 0
                                            ? 'Tambah ke Keranjang'
                                            : 'Stok Habis'}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="hum-modal-back"
                                    onClick={onClose}
                                >
                                    {typeof onAddToCart ===
                                    'function'
                                        ? 'Kembali'
                                        : 'Tutup Detail'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* LIGHTBOX FOTO BESAR */}

            {zoom && (
                <div
                    className="hum-modal-lightbox"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setZoom(false);
                        }
                    }}
                >
                    <section
                        ref={zoomRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Perbesar foto ${name}`}
                    >
                        <div className="hum-modal-lightbox-top">
                            <span>
                                {active + 1} / {count} — {name}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setZoom(false)
                                }
                                aria-label="Tutup foto besar"
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div
                            className="hum-modal-lightbox-picture"
                            onTouchStart={(event) => {
                                startTouch.current =
                                    event.touches[0]
                                        ?.clientX ?? null;
                            }}
                            onTouchEnd={touchEnd}
                        >
                            {picture(true)}

                            {count > 1 && (
                                <>
                                    <button
                                        className="hum-modal-arrow left"
                                        type="button"
                                        onClick={previous}
                                        aria-label="Foto sebelumnya"
                                    >
                                        <i className="bi bi-chevron-left" />
                                    </button>

                                    <button
                                        className="hum-modal-arrow right"
                                        type="button"
                                        onClick={next}
                                        aria-label="Foto berikutnya"
                                    >
                                        <i className="bi bi-chevron-right" />
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* CSS */}

            <style>{`
                .hum-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 2100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    background: rgba(15,23,42,.72);
                    backdrop-filter: blur(5px);
                }

                .hum-modal-window {
                    background: #fff;
                    border-radius: 23px;
                    width: min(1030px,100%);
                    max-height: 94dvh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 80px #02061755;
                    outline: none;
                }

                .hum-modal-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 18px;
                    align-items: start;
                    padding: 22px 25px;
                    background: linear-gradient(
                        125deg,#0f172a,#164e63
                    );
                    color: white;
                }

                .hum-modal-header small {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: .5px;
                    color: #a7f3d0;
                }

                .hum-modal-header h2 {
                    font-size: 21px;
                    font-weight: 800;
                    line-height: 1.4;
                    margin: 7px 0 0;
                    overflow-wrap: anywhere;
                }

                .hum-modal-close {
                    width: 39px;
                    height: 39px;
                    flex-shrink: 0;
                    border: 1px solid #ffffff50;
                    border-radius: 12px;
                    background: #ffffff20;
                    color: white;
                }

                .hum-modal-body {
                    padding: 25px;
                    display: grid;
                    grid-template-columns: 1.05fr .95fr;
                    gap: 26px;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                }

                .hum-modal-photo {
                    height: 370px;
                    max-height: 47vh;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    overflow: hidden;
                    touch-action: pan-y;
                }

                .hum-modal-main-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 15px;
                }

                .hum-modal-empty {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: center;
                    color: #94a3b8;
                }

                .hum-modal-zoom-button {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: #ffffffee;
                    border: 1px solid #cbd5e1;
                    border-radius: 20px;
                    padding: 7px 12px;
                    font-weight: 700;
                    font-size: 12px;
                }

                .hum-modal-arrow {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 41px;
                    height: 41px;
                    border: 1px solid #e2e8f0;
                    border-radius: 50%;
                    background: #fff;
                    color: #0f172a;
                    box-shadow: 0 3px 15px #0f172a20;
                }

                .hum-modal-arrow.left {
                    left: 10px;
                }

                .hum-modal-arrow.right {
                    right: 10px;
                }

                .hum-modal-counter {
                    position: absolute;
                    bottom: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #0f172acc;
                    color: #fff;
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                }

                .hum-modal-thumbnails {
                    display: flex;
                    gap: 10px;
                    overflow-x: auto;
                    padding: 12px 2px;
                }

                .hum-modal-thumbnails button {
                    flex: 0 0 66px;
                    width: 66px;
                    height: 66px;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 11px;
                    padding: 4px;
                    overflow: hidden;
                }

                .hum-modal-thumbnails button.selected {
                    border-color: #059669;
                }

                .hum-modal-thumbnails img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .hum-modal-help {
                    font-size: 12px;
                    color: #64748b;
                    text-align: center;
                    margin: 0;
                }

                .hum-modal-details {
                    min-width: 0;
                }

                .hum-modal-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 15px;
                }

                .hum-modal-tags span {
                    background: #f1f5f9;
                    color: #334155;
                    padding: 6px 11px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                }

                .hum-modal-tags .available {
                    background: #dcfce7;
                    color: #047857;
                }

                .hum-modal-tags .empty {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .hum-modal-details h3 {
                    font-size: 24px;
                    line-height: 1.3;
                    font-weight: 800;
                    color: #0f172a;
                    overflow-wrap: anywhere;
                }

                .hum-modal-stock {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    background: #ecfdf5;
                    border: 1px solid #d1fae5;
                    border-radius: 15px;
                    padding: 15px;
                    margin: 18px 0;
                    color: #047857;
                }

                .hum-modal-stock small {
                    display: block;
                    color: #64748b;
                }

                .hum-modal-stock strong {
                    display: block;
                    font-size: 22px;
                }

                .hum-modal-details h4 {
                    font-size: 16px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .hum-modal-description {
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                    line-height: 1.75;
                    font-size: 14px;
                    color: #475569;
                    max-height: 240px;
                    overflow: auto;
                }

                .hum-modal-note {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px;
                    font-size: 12px;
                    color: #64748b;
                    line-height: 1.6;
                }

                .hum-modal-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 20px;
                }

                .hum-modal-actions button {
                    border-radius: 30px;
                    padding: 11px 17px;
                    font-size: 13px;
                    font-weight: 700;
                }

                .hum-modal-add {
                    background: #059669;
                    color: white;
                    border: 1px solid #059669;
                    flex: 1;
                }

                .hum-modal-add:disabled {
                    background: #94a3b8;
                    border-color: #94a3b8;
                }

                .hum-modal-back {
                    background: white;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                }

                .hum-modal-lightbox {
                    position: fixed;
                    inset: 0;
                    z-index: 2200;
                    padding: 15px;
                    background: #020617f5;
                }

                .hum-modal-lightbox section {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    max-width: 1400px;
                    margin: auto;
                    outline: none;
                }

                .hum-modal-lightbox-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                    padding-bottom: 12px;
                    gap: 10px;
                }

                .hum-modal-lightbox-top span {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .hum-modal-lightbox-top button {
                    color: white;
                    border: 1px solid #ffffff55;
                    background: #ffffff22;
                    border-radius: 10px;
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                }

                .hum-modal-lightbox-picture {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    min-height: 0;
                    touch-action: pan-y;
                }

                .hum-modal-zoom-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .hum-modal-window button:focus-visible,
                .hum-modal-lightbox button:focus-visible {
                    outline: 3px solid #86efac;
                    outline-offset: 2px;
                }

                @media (max-width: 800px) {
                    .hum-modal-body {
                        grid-template-columns: 1fr;
                    }

                    .hum-modal-photo {
                        height: 310px;
                        max-height: none;
                    }
                }

                @media (max-width: 575px) {
                    .hum-modal-backdrop {
                        padding: 0;
                    }

                    .hum-modal-window {
                        height: 100dvh;
                        max-height: 100dvh;
                        border-radius: 0;
                    }

                    .hum-modal-header {
                        padding: 17px;
                    }

                    .hum-modal-body {
                        padding: 15px;
                    }

                    .hum-modal-photo {
                        height: 260px;
                    }

                    .hum-modal-details h3 {
                        font-size: 21px;
                    }

                    .hum-modal-actions {
                        flex-direction: column;
                    }

                    .hum-modal-actions button {
                        width: 100%;
                    }
                }
            `}</style>
        </>,
        document.body
    );
}
