
import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const DOCUMENTS = [
    {
        key: 'rundown',
        label: 'Rundown Kegiatan',
        required: true,
        icon: 'bi-file-earmark-spreadsheet',
        nameKey: 'rundown_name',
        pathKey: 'rundown_path',
        urlKey: 'rundown_url',
    },
    {
        key: 'tor',
        label: 'TOR (Term of Reference)',
        required: false,
        icon: 'bi-file-earmark-text',
        nameKey: 'tor_name',
        pathKey: 'tor_path',
        urlKey: 'tor_url',
    },
];

const getErrorMessage = (error) => {
    const message = error?.response?.data?.message;

    if (typeof message === 'string') {
        return message;
    }

    if (error?.response?.status === 403) {
        return 'Kamu tidak memiliki akses ke dokumen ini.';
    }

    if (error?.response?.status === 404) {
        return 'Dokumen tidak ditemukan di server.';
    }

    return 'Dokumen gagal dimuat. Coba kembali.';
};

const isPdf = (filename) =>
    /\.pdf$/i.test(String(filename || ''));

const safeFilename = (name) =>
    String(name || 'dokumen')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

export default function DirectorateDocuments({
    request,
    compact = false,
}) {
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    const previewUrlRef = useRef(null);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
        };
    }, []);

    const clearPreview = () => {
        setPreview(null);

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    };

    const fetchDocument = async (documentType, disposition) => {
        if (!request?.id) {
            throw new Error('ID pengajuan tidak tersedia.');
        }

        const response = await api.get(
            `/event-schedule-requests/${request.id}`,
            {
                params: {
                    document: documentType,
                    disposition,
                },
                responseType: 'blob',
            }
        );

        return response.data;
    };

    const openPreview = async (document) => {
        const name = request?.[document.nameKey];

        if (!isPdf(name)) {
            setError(
                'Preview tersedia untuk PDF. File Word dan Excel dapat diunduh.'
            );
            return;
        }

        try {
            setError('');
            setBusy(`preview-${document.key}`);

            clearPreview();

            const blob = await fetchDocument(
                document.key,
                'inline'
            );

            const pdfBlob = new Blob(
                [blob],
                { type: 'application/pdf' }
            );

            const url = URL.createObjectURL(pdfBlob);

            previewUrlRef.current = url;

            setPreview({
                title: document.label,
                filename: name,
                url,
            });
        } catch (err) {
            setError(
                err?.message && !err?.response
                    ? err.message
                    : getErrorMessage(err)
            );
        } finally {
            setBusy('');
        }
    };

    const downloadDocument = async (document) => {
        try {
            setError('');
            setBusy(`download-${document.key}`);

            const blob = await fetchDocument(
                document.key,
                'attachment'
            );

            const blobUrl = URL.createObjectURL(blob);
            const link = window.document.createElement('a');

            link.href = blobUrl;
            link.download = safeFilename(
                request?.[document.nameKey] ||
                `${document.key}.pdf`
            );

            window.document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (err) {
            setError(
                err?.message && !err?.response
                    ? err.message
                    : getErrorMessage(err)
            );
        } finally {
            setBusy('');
        }
    };

    if (!request) {
        return null;
    }

    return (
        <>
            <section
                className={
                    compact
                        ? 'mb-3'
                        : 'card border-0 shadow-sm rounded-4 mb-4'
                }
            >
                <div className={compact ? '' : 'card-body p-4'}>
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <i className="bi bi-paperclip text-danger" />

                        <div>
                            <h6 className="fw-bold mb-0">
                                Lampiran Kegiatan
                            </h6>

                            <small className="text-muted">
                                Rundown wajib, TOR opsional
                            </small>
                        </div>
                    </div>

                    {error && (
                        <div
                            className="alert alert-warning py-2 small"
                            role="alert"
                        >
                            <i className="bi bi-exclamation-circle me-2" />
                            {error}
                        </div>
                    )}

                    <div className="row g-3">
                        {DOCUMENTS.map((document) => {
                            const name =
                                request[document.nameKey] || '';

                            const available = Boolean(
                                request[document.pathKey] ||
                                request[document.urlKey] ||
                                name
                            );

                            const pdf = isPdf(name);

                            const previewLoading =
                                busy === `preview-${document.key}`;

                            const downloadLoading =
                                busy === `download-${document.key}`;

                            return (
                                <div
                                    className="col-12 col-md-6"
                                    key={document.key}
                                >
                                    <div className="border rounded-4 p-3 h-100">
                                        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                            <div className="d-flex align-items-start gap-2">
                                                <i
                                                    className={`bi ${document.icon} fs-5 text-danger`}
                                                />

                                                <div>
                                                    <div className="small fw-bold">
                                                        {document.label}
                                                    </div>

                                                    <div
                                                        className="small text-muted text-break mt-1"
                                                        title={name}
                                                    >
                                                        {available
                                                            ? name || 'Dokumen tersedia'
                                                            : 'Tidak ada lampiran'}
                                                    </div>
                                                </div>
                                            </div>

                                            <span
                                                className={
                                                    document.required
                                                        ? 'badge bg-danger-subtle text-danger rounded-pill'
                                                        : 'badge bg-light text-secondary rounded-pill'
                                                }
                                            >
                                                {document.required
                                                    ? 'Wajib'
                                                    : 'Opsional'}
                                            </span>
                                        </div>

                                        {available ? (
                                            <div className="d-flex flex-wrap gap-2">
                                                {pdf && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary rounded-pill"
                                                        onClick={() =>
                                                            openPreview(document)
                                                        }
                                                        disabled={Boolean(busy)}
                                                    >
                                                        {previewLoading ? (
                                                            <span className="spinner-border spinner-border-sm me-2" />
                                                        ) : (
                                                            <i className="bi bi-eye me-2" />
                                                        )}
                                                        Preview
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                    onClick={() =>
                                                        downloadDocument(document)
                                                    }
                                                    disabled={Boolean(busy)}
                                                >
                                                    {downloadLoading ? (
                                                        <span className="spinner-border spinner-border-sm me-2" />
                                                    ) : (
                                                        <i className="bi bi-download me-2" />
                                                    )}
                                                    Download
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="small text-muted">
                                                {document.required
                                                    ? 'Lampiran belum tersedia pada pengajuan ini.'
                                                    : 'TOR tidak dilampirkan.'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {preview && (
                <div
                    className="modal d-block"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Preview ${preview.title}`}
                    style={{
                        background: 'rgba(15,23,42,.75)',
                        zIndex: 2000,
                    }}
                >
                    <div
                        className="modal-dialog modal-xl modal-dialog-centered"
                        style={{
                            maxWidth: 1000,
                            marginTop: '1rem',
                            marginBottom: '1rem',
                        }}
                    >
                        <div className="modal-content border-0 rounded-4 overflow-hidden">
                            <div className="modal-header">
                                <div className="min-w-0">
                                    <h6 className="modal-title fw-bold">
                                        <i className="bi bi-file-earmark-pdf text-danger me-2" />
                                        {preview.title}
                                    </h6>

                                    <div className="small text-muted text-truncate">
                                        {preview.filename}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Tutup preview"
                                    onClick={clearPreview}
                                />
                            </div>

                            <div className="modal-body p-0">
                                <iframe
                                    src={preview.url}
                                    title={`Preview ${preview.filename}`}
                                    style={{
                                        border: 0,
                                        width: '100%',
                                        height: 'min(72vh, 760px)',
                                    }}
                                />
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    onClick={clearPreview}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
