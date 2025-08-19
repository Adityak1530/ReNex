// Guest Profile Viewer with ReNex ID System

class GuestViewer { 
    constructor() {
        this.currentProfile = null;
        this.init();
        //world king 

    }

    init() {
        // Check if we have a user ID in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user');
        const rexId = urlParams.get('id');
        
        if (targetUserId && rexId) {
            this.displayRexId(rexId);
            this.loadProfile(targetUserId);
        } else {
            this.displayRexId('Not specified');
        }

        this.setupEventListeners();
    }

    displayRexId(rexId) {
        const rexIdDisplay = document.getElementById('rex-id-display');
        if (rexIdDisplay) {
            rexIdDisplay.textContent = `Viewing Profile: ReNex ID ${rexId}`;
        }
    }

    setupEventListeners() {
        // No search functionality needed since we removed the search section
        // All profile loading is done through URL parameters
    }

    loadProfile(userId) {
        try {
            // Get user data
            const users = JSON.parse(localStorage.getItem('renx_users') || '[]');
            const user = users.find(u => u.id === userId);

            if (!user) {
                alert('User profile not found');
                return;
            }

            // Get user profile data
            const userProfiles = JSON.parse(localStorage.getItem('renx_user_profiles') || '{}');
            const userProfile = userProfiles[userId] || {};

            this.currentProfile = {
                ...user,
                ...userProfile
            };

            this.displayProfile();

        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Error loading profile. Please try again.');
        }
    }

    displayProfile() {
        if (!this.currentProfile) return;

        // Display basic info
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role');
        const profileBio = document.getElementById('profile-bio');

        if (profileName) profileName.textContent = this.currentProfile.name || this.currentProfile.full_name || 'Unknown User';
        if (profileRole) profileRole.textContent = this.currentProfile.role || 'Role not specified';
        if (profileBio) profileBio.textContent = this.currentProfile.bio || 'No bio available';

        // Display resume
        this.displayResume();

        // Display certificates
        this.displayCertificates();

        // Show the profile section
        const profileSection = document.getElementById('profile-section');
        if (profileSection) {
            profileSection.style.display = 'block';
        }
    }

    displayResume() {
        const resumeDisplay = document.getElementById('resume-display');
        if (!resumeDisplay) return;

        if (this.currentProfile.resume) {
            const isPDF = this.currentProfile.resume.type === 'application/pdf';
            const isImage = this.currentProfile.resume.type.startsWith('image/');

            if (isPDF) {
                resumeDisplay.innerHTML = `
                    <div class="resume-pdf-container">
                        <embed src="${this.currentProfile.resume.data}#toolbar=0&navpanes=0&scrollbar=0" 
                               type="application/pdf" width="100%" height="500px" class="resume-pdf">
                    </div>
                    <div class="resume-actions">
                        <button onclick="guestViewer.downloadResume()" class="download-btn">Download Resume</button>
                    </div>
                `;
            } else if (isImage) {
                resumeDisplay.innerHTML = `
                    <div class="resume-image-container">
                        <img src="${this.currentProfile.resume.data}" alt="Resume" class="resume-image">
                    </div>
                    <div class="resume-actions">
                        <button onclick="guestViewer.downloadResume()" class="download-btn">Download Resume</button>
                    </div>
                `;
            } else {
                resumeDisplay.innerHTML = `
                    <p style="color: #666; font-style: italic;">Resume available for download</p>
                    <div class="resume-actions">
                        <button onclick="guestViewer.downloadResume()" class="download-btn">Download Resume</button>
                    </div>
                `;
            }
        } else {
            resumeDisplay.innerHTML = '<p style="color: #666; font-style: italic;">No resume uploaded yet</p>';
        }
    }

    displayCertificates() {
        const certificatesDisplay = document.getElementById('certificates-display');
        if (!certificatesDisplay) return;

        if (this.currentProfile.certificates && this.currentProfile.certificates.length > 0) {
            const certificatesHtml = this.currentProfile.certificates.map((cert, index) => `
                <div class="certificate-item">
                    <img src="${cert.url}" alt="Certificate ${index + 1}" class="certificate-image">
                    <div class="certificate-actions">
                        <button onclick="guestViewer.downloadCertificate('${cert.name}')" class="download-btn">Download</button>
                    </div>
                </div>
            `).join('');

            certificatesDisplay.innerHTML = `
                <div class="certificates-grid">
                    ${certificatesHtml}
                </div>
            `;
        } else {
            certificatesDisplay.innerHTML = '<p style="color: #666; font-style: italic;">No certificates uploaded yet</p>';
        }
    }

    downloadResume() {
        if (this.currentProfile.resume) {
            const link = document.createElement('a');
            link.href = this.currentProfile.resume.data;
            link.download = this.currentProfile.resume.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    downloadCertificate(certName) {
        const certificate = this.currentProfile.certificates.find(cert => cert.name === certName);
        if (certificate) {
            const link = document.createElement('a');
            link.href = certificate.url;
            link.download = certificate.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Initialize guest viewer when page loads
let guestViewer;
document.addEventListener('DOMContentLoaded', () => {
    guestViewer = new GuestViewer();
});

// Make guestViewer globally available for button clicks
window.guestViewer = guestViewer;
