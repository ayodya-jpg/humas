import Swal from 'sweetalert2';

export const showSuccessAlert = (title, text = '') => {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2563eb',
        timer: 2200,
        timerProgressBar: true,
    });
};

export const showErrorAlert = (title, text = '') => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#dc2626',
    });
};

export const showWarningAlert = (title, text = '') => {
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'Oke',
        confirmButtonColor: '#f59e0b',
    });
};

export const showInfoAlert = (title, text = '') => {
    return Swal.fire({
        icon: 'info',
        title,
        text,
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2563eb',
    });
};

export const showConfirmAlert = ({
    title = 'Apakah kamu yakin?',
    text = 'Aksi ini akan diproses.',
    confirmButtonText = 'Ya, lanjutkan',
    cancelButtonText = 'Batal',
    icon = 'question',
    confirmButtonColor = '#2563eb',
} = {}) => {
    return Swal.fire({
        icon,
        title,
        text,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor,
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
    });
};

export const showTextareaAlert = ({
    title = 'Masukkan catatan',
    text = '',
    inputLabel = 'Catatan',
    inputPlaceholder = 'Tuliskan catatan...',
    confirmButtonText = 'Simpan',
    cancelButtonText = 'Batal',
    confirmButtonColor = '#2563eb',
    minimumLength = 5,
    maximumLength = 2000,
} = {}) => {
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        input: 'textarea',
        inputLabel,
        inputPlaceholder,
        inputAttributes: {
            maxlength: maximumLength,
            autocapitalize: 'sentences',
        },
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor,
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
        inputValidator: (value) => {
            const normalizedValue = value?.trim() || '';

            if (!normalizedValue) {
                return `${inputLabel} wajib diisi.`;
            }

            if (normalizedValue.length < minimumLength) {
                return `${inputLabel} minimal ${minimumLength} karakter.`;
            }

            if (normalizedValue.length > maximumLength) {
                return `${inputLabel} maksimal ${maximumLength} karakter.`;
            }

            return undefined;
        },
    });
};

const normalizeUrl = (value) => {
    const trimmedValue = value?.trim() || '';

    if (!trimmedValue) {
        return '';
    }

    if (/^https?:\/\//i.test(trimmedValue)) {
        return trimmedValue;
    }

    return `https://${trimmedValue}`;
};

const isValidHttpUrl = (value) => {
    try {
        const parsedUrl = new URL(normalizeUrl(value));

        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
        return false;
    }
};

export const showCompletionAlert = ({
    title = 'Selesaikan request?',
    text = 'Masukkan link hasil pekerjaan yang akan diberikan kepada pemohon.',
    confirmButtonText = 'Simpan dan Selesaikan',
    cancelButtonText = 'Batal',
} = {}) => {
    return Swal.fire({
        icon: 'question',
        title,
        text,
        html: `
            <div class="text-start mt-3">
                <label
                    for="swal-result-link"
                    class="form-label fw-bold"
                >
                    Link Hasil Pekerjaan
                    <span class="text-danger">*</span>
                </label>

                <div class="input-group mb-3">
                    <span class="input-group-text">
                        <i class="bi bi-link-45deg"></i>
                    </span>

                    <input
                        id="swal-result-link"
                        type="text"
                        class="form-control"
                        placeholder="https://drive.google.com/..."
                        autocomplete="off"
                    />
                </div>

                <label
                    for="swal-result-note"
                    class="form-label fw-bold"
                >
                    Catatan Hasil
                    <span class="text-muted fw-normal">
                        (Opsional)
                    </span>
                </label>

                <textarea
                    id="swal-result-note"
                    class="form-control"
                    rows="4"
                    maxlength="3000"
                    placeholder="Contoh: Dokumentasi foto dan video telah selesai. Silakan buka link hasil berikut."
                ></textarea>

                <div class="form-text mt-2">
                    Pastikan link dapat dibuka oleh pemohon dan izin aksesnya sudah sesuai.
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
        didOpen: () => {
            const resultLinkInput = document.getElementById(
                'swal-result-link'
            );

            resultLinkInput?.focus();
        },
        preConfirm: () => {
            const resultLinkInput = document.getElementById(
                'swal-result-link'
            );

            const resultNoteInput = document.getElementById(
                'swal-result-note'
            );

            const rawResultLink = resultLinkInput?.value || '';
            const resultNote = resultNoteInput?.value?.trim() || '';

            if (!rawResultLink.trim()) {
                Swal.showValidationMessage(
                    'Link hasil pekerjaan wajib diisi.'
                );

                return false;
            }

            const normalizedResultLink = normalizeUrl(rawResultLink);

            if (!isValidHttpUrl(normalizedResultLink)) {
                Swal.showValidationMessage(
                    'Link hasil pekerjaan tidak valid.'
                );

                return false;
            }

            if (normalizedResultLink.length > 2000) {
                Swal.showValidationMessage(
                    'Link hasil pekerjaan maksimal 2.000 karakter.'
                );

                return false;
            }

            if (resultNote.length > 3000) {
                Swal.showValidationMessage(
                    'Catatan hasil maksimal 3.000 karakter.'
                );

                return false;
            }

            return {
                result_link: normalizedResultLink,
                result_note: resultNote || null,
            };
        },
    });
};

export const showLoadingAlert = (
    title = 'Memproses...',
    text = 'Mohon tunggu sebentar.'
) => {
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        },
    });
};

export const closeAlert = () => {
    Swal.close();
};