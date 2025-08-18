// Profile Management with Sanity.io
// Note: This file is deprecated. Use profile-simple.js instead which uses CDN-based Sanity client.

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    // Get current user from sessionStorage
    async getCurrentUser() {
        const userId = sessionStorage.getItem('renx_user_id');
        const userEmail = sessionStorage.getItem('renx_user_email');
        
        if (!userId || !userEmail) {
            // Redirect to login if no user found
            window.location.href = 'login.html';
            return null;
        }

        try {
            // Get user from Sanity database
            const { data: user, error } = await db.getUserByEmail(userEmail);
            
            if (error || !user || user._id !== userId) {
                console.error('User not found in database, redirecting to login');
                // Clear invalid session
                sessionStorage.removeItem('renx_user_id');
                sessionStorage.removeItem('renx_user_email');
                sessionStorage.removeItem('renx_user_rex_id');
                sessionStorage.removeItem('renx_login_time');
                window.location.href = 'login.html';
                return null;
            }

            // Get user profile from Sanity
            const { data: profile, error: profileError } = await db.getProfile(userId);
            
            if (profileError) {
                console.error('Error loading profile:', profileError);
            }

            return {
                id: userId,
                email: userEmail,
                name: profile?.name || user.fullName || 'New User',
                role: profile?.role || 'Not specified',
                bio: profile?.bio || 'Welcome to ReNex! Create your virtual portfolio by editing your profile.',
                photo: profile?.photoUrl || null,
                resume: profile?.resumeUrl || null,
                certificates: [] // Will be loaded separately
            };
        } catch (error) {
            console.error('Error getting current user:', error);
            window.location.href = 'login.html';
            return null;
        }
    }

    // Check storage usage
    checkStorageUsage() {
        try {
            const userProfiles = localStorage.getItem('renx_user_profiles') || '{}';
            const users = localStorage.getItem('renx_users') || '[]';
            const totalSize = new Blob([userProfiles, users]).size;
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            const usagePercent = (totalSize / maxSize) * 100;
            
            console.log(`Storage usage: ${(totalSize / 1024 / 1024).toFixed(2)}MB / 5MB (${usagePercent.toFixed(1)}%)`);
            
            // Show warning if usage is high
            if (usagePercent > 80) {
                this.showNotification('Storage is getting full. Consider removing some files.', 'error');
            }
            
            return { totalSize, maxSize, usagePercent };
        } catch (error) {
            console.error('Error checking storage usage:', error);
            return null;
        }
    }

    // Initialize the profile page
    async init() {
        this.currentUser = await this.getCurrentUser();
        if (!this.currentUser) return;

        this.loadProfileData();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    // Load profile data from localStorage
    loadProfileData() {
        const { name, email, role, bio, photo, resume, certificates } = this.currentUser;

        // Update header name
        const headerNameElement = document.getElementById('headerName');
        if (headerNameElement) {
            headerNameElement.textContent = name;
        }

        // Update profile display
        const profileNameElement = document.querySelector('.profile-name');
        if (profileNameElement) {
            profileNameElement.textContent = name;
        }

        // Update role display
        const roleElement = document.querySelector('.role');
        if (roleElement) {
            roleElement.textContent = `Role: ${role}`;
        }

        // Display ReNex ID
        this.displayReNexId();

        // Update bio content
        const bioTextElements = document.querySelectorAll('.bio-text');
        if (bioTextElements.length > 0) {
            const bioLines = bio.split('\n\n');
            bioTextElements.forEach((element, index) => {
                if (bioLines[index]) {
                    element.textContent = bioLines[index];
                }
            });
        }

        // Load profile photo
        if (photo) {
            const profileImage = document.getElementById('profileImage');
            if (profileImage) {
                profileImage.src = photo;
            }
        }

        // Update resume display
        this.updateResumeDisplay(resume);

        // Update certificates display
        this.updateCertificatesDisplay(certificates);
    }

    // Display ReNex ID
    displayReNexId() {
        // Get user's ReNex ID
        const users = JSON.parse(localStorage.getItem('renx_users') || '[]');
        const user = users.find(u => u.id === this.currentUser.id);
        
        if (user && user.renexId) {
            // Create or update ReNex ID display
            let rexIdElement = document.querySelector('.rex-id-display');
            if (!rexIdElement) {
                rexIdElement = document.createElement('div');
                rexIdElement.className = 'rex-id-display';
                rexIdElement.style.cssText = `
                    background: #f8f9fa;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                    text-align: center;
                    border: 1px solid #e9ecef;
                `;
                
                // Insert after profile name
                const profileNameElement = document.querySelector('.profile-name');
                if (profileNameElement && profileNameElement.parentNode) {
                    profileNameElement.parentNode.insertBefore(rexIdElement, profileNameElement.nextSibling);
                }
            }
            
            rexIdElement.innerHTML = `
                <strong>ReNex ID:</strong> <span style="color: #007bff; font-family: monospace; font-size: 1.1em;">${user.renexId}</span>
                <br><small style="color: #666;">Share this ID with others to let them view your profile</small>
            `;
        }
    }

    // Update resume display
    updateResumeDisplay(resume) {
        const resumeItems = document.querySelector('.resume-items');
        
        if (resume) {
            // Check if it's a PDF or image file
            const isPDF = resume.type === 'application/pdf';
            const isImage = resume.type.startsWith('image/');
            
            let resumeContent = '';
            
            if (isPDF) {
                // For PDF files, embed the PDF directly without header
                resumeContent = `
                    <div class="resume-pdf-container">
                        <embed src="${resume.data}#toolbar=0&navpanes=0&scrollbar=0" type="application/pdf" width="100%" height="500px" class="resume-pdf">
                    </div>
                `;
            } else if (isImage) {
                // For image files, show the actual image
                resumeContent = `
                    <div class="resume-image-container">
                        <img src="${resume.data}" alt="${resume.name}" class="resume-image">
                    </div>
                `;
            } else {
                // For other file types, show a generic document icon
                resumeContent = `
                    <div class="resume-preview">
                        <div class="document-icon">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M14 2V8H20" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16 13H8" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16 17H8" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10 9H9H8" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                `;
            }
            
            resumeItems.innerHTML = `
                <div class="resume-item">
                    ${resumeContent}
                    <div class="resume-actions">
                        <button onclick="profileManager.downloadResume('${resume.name}')" class="download-btn">Download</button>
                        <button onclick="profileManager.removeResume('${resume.name}')" class="remove-btn">Remove</button>
                    </div>
                </div>
            `;
        } else {
            resumeItems.innerHTML = '<p style="color: #666; font-style: italic;">No resume uploaded yet</p>';
        }
    }

    // Update certificates display
    updateCertificatesDisplay(certificates) {
        const certificateItems = document.querySelector('.certificate-items');
        
        if (certificates.length > 0) {
            certificateItems.innerHTML = certificates.map((cert, index) => `
                <div class="certificate-item">
                    <img src="${cert.url}" alt="Certificate ${index + 1}">
                    <div class="certificate-actions">
                        <button onclick="profileManager.downloadCertificate('${cert.name}')" class="download-btn">Download</button>
                        <button onclick="profileManager.removeCertificate('${cert.name}')" class="remove-btn">Remove</button>
                    </div>
                </div>
            `).join('');
            
            // Initialize slider functionality
            this.initCertificateSlider();
        } else {
            certificateItems.innerHTML = '<p style="color: #666; font-style: italic;">No certificates uploaded yet</p>';
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Setup event listeners
    setupEventListeners() {
        // Edit Profile Button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.openEditModal();
            });
        }

        // Storage Management Button
        const storageBtn = document.getElementById('storageBtn');
        if (storageBtn) {
            storageBtn.addEventListener('click', () => {
                this.showStorageInfo();
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Modal close button
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        // Cancel edit button
        const cancelEditBtn = document.getElementById('cancelEdit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        // Edit form submission
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileChanges();
            });
        }

        // Certificates upload button (outside modal)
        const uploadCertificatesBtn = document.getElementById('uploadCertificatesBtn');
        if (uploadCertificatesBtn) {
            uploadCertificatesBtn.addEventListener('click', () => {
                this.uploadCertificates();
            });
        }

        // Photo upload button (outside modal)
        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        if (uploadPhotoBtn) {
            uploadPhotoBtn.addEventListener('click', () => {
                this.uploadPhoto();
            });
        }

        // Resume upload button (outside modal)
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        if (uploadResumeBtn) {
            uploadResumeBtn.addEventListener('click', () => {
                this.uploadResume();
            });
        }

        // Certificate slider buttons
        const prevCertBtn = document.getElementById('prevCertBtn');
        const nextCertBtn = document.getElementById('nextCertBtn');
        
        if (prevCertBtn) {
            prevCertBtn.addEventListener('click', () => {
                this.slideCertificates('prev');
            });
        }
        
        if (nextCertBtn) {
            nextCertBtn.addEventListener('click', () => {
                this.slideCertificates('next');
            });
        }
    }

    // Open edit modal
    openEditModal() {
        const modal = document.getElementById('editModal');
        if (!modal) return;

        const { name, email, role, bio } = this.currentUser;

        // Pre-fill form
        const editNameInput = document.getElementById('editName');
        const editEmailInput = document.getElementById('editEmail');
        const editRoleInput = document.getElementById('editRole');
        const editBioInput = document.getElementById('editBio');

        if (editNameInput) editNameInput.value = name;
        if (editEmailInput) editEmailInput.value = email;
        if (editRoleInput) editRoleInput.value = role;
        if (editBioInput) editBioInput.value = bio;

        modal.style.display = 'block';
    }

    // Close edit modal
    closeEditModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Save profile changes
    saveProfileChanges() {
        const form = document.getElementById('editProfileForm');
        const formData = new FormData(form);

        // Update user data
        this.currentUser.name = formData.get('name');
        this.currentUser.email = formData.get('email');
        this.currentUser.role = formData.get('role');
        this.currentUser.bio = formData.get('bio');

        // Track upload promises
        const uploadPromises = [];

        // Handle photo upload
        const photoFile = formData.get('photo');
        if (photoFile && photoFile.size > 0) {
            uploadPromises.push(this.handlePhotoUploadAsync(photoFile));
        }

        // Handle resume upload
        const resumeFile = formData.get('resume');
        if (resumeFile && resumeFile.size > 0) {
            uploadPromises.push(this.handleResumeUploadAsync(resumeFile));
        }

        // Handle certificate uploads
        const certificateFiles = formData.getAll('certificates');
        if (certificateFiles && certificateFiles.length > 0) {
            certificateFiles.forEach(file => {
                if (file && file.size > 0) {
                    uploadPromises.push(this.handleCertificateUploadAsync(file));
                }
            });
        }

        // Wait for all uploads to complete, then save
        Promise.all(uploadPromises).then(() => {
            // Save to localStorage
            const saveSuccess = this.saveToLocalStorage();

            if (saveSuccess) {
                // Update display
                this.loadProfileData();

                // Close modal
                this.closeEditModal();

                // Show success message
                this.showNotification('Profile updated successfully!', 'success');
            } else {
                // Keep modal open if save failed
                this.showNotification('Failed to save changes. Please try again.', 'error');
            }
        }).catch(error => {
            console.error('Error during file uploads:', error);
            this.showNotification('Error uploading files. Please try again.', 'error');
        });
    }

    // Async photo upload handler
    handlePhotoUploadAsync(file) {
        return new Promise((resolve, reject) => {
            // Check file size (max 2MB for photos)
            if (file.size > 2 * 1024 * 1024) {
                this.showNotification('Photo size must be less than 2MB. Please compress the image.', 'error');
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Compress image if it's too large
                this.compressImage(e.target.result, (compressedData) => {
                    this.currentUser.photo = compressedData;
                    
                    // Update the profile image display immediately
                    const profileImage = document.getElementById('profileImage');
                    if (profileImage) {
                        profileImage.src = compressedData;
                    }
                    
                    this.showNotification('Profile photo updated successfully!', 'success');
                    resolve();
                });
            };
            reader.onerror = () => reject(new Error('Failed to read photo file'));
            reader.readAsDataURL(file);
        });
    }

    // Async resume upload handler
    handleResumeUploadAsync(file) {
        return new Promise((resolve, reject) => {
            // Check file size (max 5MB for resumes)
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification('Resume size must be less than 5MB. Please compress the file.', 'error');
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const resume = {
                    name: file.name,
                    data: e.target.result,
                    type: file.type || this.getFileTypeFromName(file.name),
                    size: file.size
                };
                
                this.currentUser.resume = resume;
                this.updateResumeDisplay(this.currentUser.resume);
                this.showNotification('Resume uploaded successfully!', 'success');
                resolve();
            };
            reader.onerror = () => reject(new Error('Failed to read resume file'));
            reader.readAsDataURL(file);
        });
    }

    // Async certificate upload handler
    handleCertificateUploadAsync(file) {
        return new Promise((resolve, reject) => {
            // Check if already have 20 certificates
            if (this.currentUser.certificates.length >= 20) {
                this.showNotification('Maximum 20 certificates allowed. Please remove one first.', 'error');
                reject(new Error('Too many certificates'));
                return;
            }

            // Check file size (max 3MB for certificates)
            if (file.size > 3 * 1024 * 1024) {
                this.showNotification('Certificate size must be less than 3MB. Please compress the file.', 'error');
                reject(new Error('File too large'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const certificate = {
                    name: file.name,
                    url: e.target.result,
                    type: file.type,
                    size: file.size
                };
                
                this.currentUser.certificates.push(certificate);
                this.updateCertificatesDisplay(this.currentUser.certificates);
                this.showNotification('Certificate uploaded successfully!', 'success');
                resolve();
            };
            reader.onerror = () => reject(new Error('Failed to read certificate file'));
            reader.readAsDataURL(file);
        });
    }

    // Get file type from filename if MIME type is not available
    getFileTypeFromName(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
        };
        return typeMap[extension] || 'application/octet-stream';
    }

    // Download resume
    downloadResume(resumeName) {
        if (this.currentUser.resume && this.currentUser.resume.name === resumeName) {
            const link = document.createElement('a');
            link.href = this.currentUser.resume.data;
            link.download = this.currentUser.resume.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Remove resume
    removeResume(resumeName) {
        if (confirm('Are you sure you want to remove this resume?')) {
            this.currentUser.resume = null;
            this.saveToLocalStorage();
            this.updateResumeDisplay(this.currentUser.resume);
            this.showNotification('Resume removed successfully!', 'success');
        }
    }

    // Upload resume
    uploadResume() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleResumeUpload(file);
            }
        };
        input.click();
    }

    // Upload photo
    uploadPhoto() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handlePhotoUpload(file);
            }
        };
        input.click();
    }

    // Upload certificates
    uploadCertificates() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                files.forEach(file => {
                    this.handleCertificateUpload(file);
                });
            }
        };
        input.click();
    }

    // Handle certificate upload
    handleCertificateUpload(file) {
        // Check if already have 20 certificates
        if (this.currentUser.certificates.length >= 20) {
            this.showNotification('Maximum 20 certificates allowed. Please remove one first.', 'error');
            return;
        }

        // Check file size (max 3MB for certificates)
        if (file.size > 3 * 1024 * 1024) {
            this.showNotification('Certificate size must be less than 3MB. Please compress the file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const certificate = {
                name: file.name,
                url: e.target.result,
                type: file.type,
                size: file.size
            };
            
            this.currentUser.certificates.push(certificate);
            this.saveToLocalStorage();
            this.updateCertificatesDisplay(this.currentUser.certificates);
            this.showNotification('Certificate uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }

    // Download certificate
    downloadCertificate(certName) {
        const certificate = this.currentUser.certificates.find(cert => cert.name === certName);
        if (certificate) {
            const link = document.createElement('a');
            link.href = certificate.url;
            link.download = certificate.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Remove certificate
    removeCertificate(certName) {
        if (confirm('Are you sure you want to remove this certificate?')) {
            this.currentUser.certificates = this.currentUser.certificates.filter(c => c.name !== certName);
            this.saveToLocalStorage();
            this.updateCertificatesDisplay(this.currentUser.certificates);
            this.showNotification('Certificate removed successfully!', 'success');
        }
    }

    // Initialize certificate slider
    initCertificateSlider() {
        this.currentSlide = 0;
        this.updateSliderButtons();
    }

    // Slide certificates
    slideCertificates(direction) {
        const certificateItems = document.querySelector('.certificate-items');
        const items = certificateItems.querySelectorAll('.certificate-item');
        const totalItems = items.length;
        
        if (totalItems === 0) return;
        
        if (direction === 'next') {
            this.currentSlide = Math.min(this.currentSlide + 1, totalItems - 1);
        } else {
            this.currentSlide = Math.max(this.currentSlide - 1, 0);
        }
        
        const slideWidth = 250 + 16; // item width + gap
        certificateItems.style.transform = `translateX(-${this.currentSlide * slideWidth}px)`;
        
        this.updateSliderButtons();
    }

    // Update slider buttons
    updateSliderButtons() {
        const prevBtn = document.getElementById('prevCertBtn');
        const nextBtn = document.getElementById('nextCertBtn');
        const items = document.querySelectorAll('.certificate-item');
        const totalItems = items.length;
        
        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentSlide >= totalItems - 1;
        }
    }

    // Save data to localStorage
    saveToLocalStorage() {
        try {
            const userProfiles = JSON.parse(localStorage.getItem('renx_user_profiles') || '{}');
            
            userProfiles[this.currentUser.id] = {
                name: this.currentUser.name,
                role: this.currentUser.role,
                bio: this.currentUser.bio,
                photo: this.currentUser.photo,
                resume: this.currentUser.resume,
                certificates: this.currentUser.certificates
            };
            
            // Try to save, if quota exceeded, clean up old data
            try {
                localStorage.setItem('renx_user_profiles', JSON.stringify(userProfiles));
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, cleaning up old data...');
                    this.cleanupStorage();
                    
                    // Try again after cleanup
                    try {
                        localStorage.setItem('renx_user_profiles', JSON.stringify(userProfiles));
                    } catch (retryError) {
                        console.error('Failed to save after cleanup:', retryError);
                        
                        // Emergency cleanup - remove all non-essential data
                        this.emergencyCleanup();
                        
                        try {
                            localStorage.setItem('renx_user_profiles', JSON.stringify(userProfiles));
                        } catch (finalError) {
                            console.error('Failed to save after emergency cleanup:', finalError);
                            this.showNotification('Storage is completely full. Please remove some files and try again.', 'error');
                            return false;
                        }
                    }
                } else {
                    throw quotaError;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.showNotification('Failed to save profile data. Please try again.', 'error');
            return false;
        }
    }

    // Emergency cleanup when storage is completely full
    emergencyCleanup() {
        try {
            console.warn('Performing emergency storage cleanup...');
            
            // Remove all certificates except the most recent 5
            if (this.currentUser.certificates && this.currentUser.certificates.length > 5) {
                this.currentUser.certificates = this.currentUser.certificates.slice(-5);
                console.log('Emergency: Reduced certificates to 5 most recent');
            }
            
            // Remove resume if it's too large
            if (this.currentUser.resume && this.currentUser.resume.size > 2 * 1024 * 1024) {
                this.currentUser.resume = null;
                console.log('Emergency: Removed large resume');
            }
            
            // Compress photo further if it exists
            if (this.currentUser.photo) {
                this.compressImageEmergency(this.currentUser.photo, (compressedData) => {
                    this.currentUser.photo = compressedData;
                });
            }
            
            // Clear all other user profiles except current
            const userProfiles = JSON.parse(localStorage.getItem('renx_user_profiles') || '{}');
            const currentUserId = this.currentUser.id;
            
            Object.keys(userProfiles).forEach(userId => {
                if (userId !== currentUserId) {
                    delete userProfiles[userId];
                }
            });
            
            localStorage.setItem('renx_user_profiles', JSON.stringify(userProfiles));
            console.log('Emergency: Removed all other user profiles');
            
        } catch (error) {
            console.error('Error during emergency cleanup:', error);
        }
    }

    // Emergency image compression (very aggressive)
    compressImageEmergency(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Very aggressive compression - max 200px
            let { width, height } = img;
            const maxSize = 200;
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Very low quality compression
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.3); // 30% quality
            
            callback(compressedDataUrl);
        };
        img.src = dataUrl;
    }

    // Clean up storage by removing old data
    cleanupStorage() {
        try {
            // Get all user profiles
            const userProfiles = JSON.parse(localStorage.getItem('renx_user_profiles') || '{}');
            const profileIds = Object.keys(userProfiles);
            
            // If we have more than 3 profiles, remove the oldest ones (reduced from 5)
            if (profileIds.length > 3) {
                const sortedProfiles = profileIds
                    .map(id => ({ id, lastModified: userProfiles[id].lastModified || 0 }))
                    .sort((a, b) => a.lastModified - b.lastModified);
                
                // Remove oldest profiles (keep current user and 2 most recent)
                const profilesToRemove = sortedProfiles.slice(0, sortedProfiles.length - 3);
                
                profilesToRemove.forEach(profile => {
                    delete userProfiles[profile.id];
                });
                
                localStorage.setItem('renx_user_profiles', JSON.stringify(userProfiles));
                console.log(`Cleaned up ${profilesToRemove.length} old profiles`);
            }
            
            // Also clean up old session data
            const oldSessions = Object.keys(localStorage).filter(key => 
                key.startsWith('renx_') && 
                key !== 'renx_users' && 
                key !== 'renx_user_profiles' &&
                key !== `renx_user_id_${this.currentUser.id}` &&
                key !== `renx_user_email_${this.currentUser.id}`
            );
            
            oldSessions.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Force garbage collection by clearing some data
            if (this.currentUser.certificates && this.currentUser.certificates.length > 10) {
                // Keep only the 10 most recent certificates
                this.currentUser.certificates = this.currentUser.certificates.slice(-10);
                console.log('Reduced certificates to 10 most recent');
            }
            
        } catch (error) {
            console.error('Error during storage cleanup:', error);
        }
    }

    // Check authentication status
    checkAuthStatus() {
        if (!this.currentUser) {
            window.location.href = 'login.html';
        }
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }



    // Logout function
    logout() {
        localStorage.removeItem('renx_user_id');
        localStorage.removeItem('renx_user_email');
        localStorage.removeItem('renx_login_time');
        
        window.location.href = 'login.html';
    }

    // Compress image to reduce size
    compressImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 400px width/height for more aggressive compression)
            let { width, height } = img;
            const maxSize = 400; // Reduced from 800px
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress with lower quality
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5); // Reduced to 50% quality
            
            callback(compressedDataUrl);
        };
        img.src = dataUrl;
    }

    // Handle photo upload (for direct upload button)
    handlePhotoUpload(file) {
        this.handlePhotoUploadAsync(file).then(() => {
            this.saveToLocalStorage();
        }).catch(error => {
            console.error('Photo upload failed:', error);
        });
    }

    // Handle resume upload (for direct upload button)
    handleResumeUpload(file) {
        this.handleResumeUploadAsync(file).then(() => {
            this.saveToLocalStorage();
        }).catch(error => {
            console.error('Resume upload failed:', error);
        });
    }

    // Handle certificate upload (for direct upload button)
    handleCertificateUpload(file) {
        this.handleCertificateUploadAsync(file).then(() => {
            this.saveToLocalStorage();
        }).catch(error => {
            console.error('Certificate upload failed:', error);
        });
    }

    // Show storage information and management options
    showStorageInfo() {
        const usage = this.checkStorageUsage();
        if (!usage) return;

        const { totalSize, maxSize, usagePercent } = usage;
        const totalMB = (totalSize / 1024 / 1024).toFixed(2);
        const maxMB = (maxSize / 1024 / 1024).toFixed(2);

        let message = `Storage Usage: ${totalMB}MB / ${maxMB}MB (${usagePercent.toFixed(1)}%)\n\n`;
        
        if (usagePercent > 90) {
            message += '⚠️ Storage is critically full!\n';
            message += '• Consider removing some certificates\n';
            message += '• Remove old resume files\n';
            message += '• Compress profile photos\n\n';
            message += 'Would you like to perform emergency cleanup?';
            
            if (confirm(message)) {
                this.emergencyCleanup();
                this.saveToLocalStorage();
                this.loadProfileData();
                this.showNotification('Emergency cleanup completed!', 'success');
            }
        } else if (usagePercent > 80) {
            message += '⚠️ Storage is getting full.\n';
            message += '• Consider removing some files\n';
            message += '• Clean up old data\n\n';
            message += 'Would you like to perform cleanup?';
            
            if (confirm(message)) {
                this.cleanupStorage();
                this.saveToLocalStorage();
                this.loadProfileData();
                this.showNotification('Storage cleanup completed!', 'success');
            }
        } else {
            message += '✅ Storage usage is normal.';
            alert(message);
        }
    }
}

// Initialize profile manager when page loads
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});

// Make profileManager globally available for button clicks
window.profileManager = profileManager;
