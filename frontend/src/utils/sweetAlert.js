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