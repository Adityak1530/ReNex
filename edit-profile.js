// Edit Profile Management with Sanity.io

// Use the global Sanity client
const client = window.client;

const toastEl = document.getElementById('toast');
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// Convert file to data URL for localStorage storage
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Download file from data URL
function downloadFile(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Shortcuts to DOM
const form = document.getElementById('editForm');
const fullNameInput = document.getElementById('fullName');
const roleInput = document.getElementById('role');
const bioInput = document.getElementById('bio');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const resumeInput = document.getElementById('resumeInput');
const currentResume = document.getElementById('currentResume');
const certInput = document.getElementById('certInput');
const certList = document.getElementById('certList');
const saveBtn = document.getElementById('saveBtn');

let currentProfile = null;
let pendingCertificates = []; // new uploads (File objects)
let existingCertificates = []; // existing URLs (strings)

async function ensureSession() {
  // Use sessionStorage (consistent with login system)
  const storedUserId = sessionStorage.getItem('renx_user_id');
  const storedUserEmail = sessionStorage.getItem('renx_user_email');
  
  if (!storedUserId || !storedUserEmail) {
    console.error('No valid session found');
    window.location.href = 'login.html';
    return false;
  }
  
  return { userId: storedUserId, email: storedUserEmail };
}

async function loadProfile() {
  try {
    const session = await ensureSession();
    if (!session) return;
    
    console.log('Loading profile for user:', session.userId);
    
    // Get user data from session storage or fetch from database
    const userData = sessionStorage.getItem('renx_cached_user');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('Using cached user data:', user);
      
      // Populate form fields
      fullNameInput.value = user.name || '';
      roleInput.value = user.role || '';
      bioInput.value = user.bio || '';
      
      // Load profile image if available
      if (user.photoUrl) {
        photoPreview.src = user.photoUrl;
      }
      
      // Load resume if available
      if (user.resumeUrl && user.resumeName) {
        currentResume.href = user.resumeUrl;
        currentResume.textContent = user.resumeName;
        currentResume.classList.remove('hidden');
      }
      
      // Load certificates if available
      if (user.certificates && user.certificates.length > 0) {
        existingCertificates = user.certificates;
        renderCertificates();
      }
      
      currentProfile = user;
    } else {
      // Try to fetch from database
      const profile = await client.fetch(`*[_type == "profile" && user_id == $userId][0]`, { userId: session.userId });
      if (profile) {
        console.log('Profile found in database:', profile);
        currentProfile = profile;
        
        // Populate form fields
        fullNameInput.value = profile.name || '';
        roleInput.value = profile.role || '';
        bioInput.value = profile.bio || '';
        
        // Load profile image if available
        if (profile.photoUrl) {
          photoPreview.src = profile.photoUrl;
        }
        
        // Load resume if available
        if (profile.resumeUrl && profile.resumeName) {
          currentResume.href = profile.resumeUrl;
          currentResume.textContent = profile.resumeName;
          currentResume.classList.remove('hidden');
        }
        
        // Load certificates if available
        if (profile.certificates && profile.certificates.length > 0) {
          existingCertificates = profile.certificates;
          renderCertificates();
        }
      } else {
        console.log('No profile found, creating new one');
        // Create a basic profile structure
        currentProfile = {
          name: '',
          role: '',
          bio: '',
          photoUrl: '',
          resumeUrl: '',
          resumeName: '',
          certificates: []
        };
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Error loading profile data');
  }
}

function renderCertificates() {
  if (!certList) return;
  
  certList.innerHTML = '';
  
  // Render existing certificates
  existingCertificates.forEach((cert, index) => {
    const certEl = document.createElement('div');
    certEl.className = 'cert-item';
    certEl.innerHTML = `
      <img src="${cert}" alt="Certificate" class="cert-thumbnail" />
      <button type="button" class="remove-cert" data-index="${index}">Remove</button>
    `;
    certList.appendChild(certEl);
  });
  
  // Render pending certificates
  pendingCertificates.forEach((file, index) => {
    const certEl = document.createElement('div');
    certEl.className = 'cert-item pending';
    certEl.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="Certificate" class="cert-thumbnail" />
      <button type="button" class="remove-pending-cert" data-index="${index}">Remove</button>
    `;
    certList.appendChild(certEl);
  });
  
  // Add event listeners for remove buttons
  certList.querySelectorAll('.remove-cert').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      existingCertificates.splice(index, 1);
      renderCertificates();
    });
  });
  
  certList.querySelectorAll('.remove-pending-cert').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      pendingCertificates.splice(index, 1);
      renderCertificates();
    });
  });
}

async function saveProfile() {
  try {
    const session = await ensureSession();
    if (!session) return;
    
    showToast('Saving profile...');
    
         // Get form data
     const profileData = {
       _type: 'profile',
       user_id: session.userId,
       name: fullNameInput.value.trim(),
       role: roleInput.value.trim(),
       bio: bioInput.value.trim(),
       photoUrl: currentProfile?.photoUrl || photoPreview.src || '',
       resumeUrl: currentProfile?.resumeUrl || '',
       resumeName: currentProfile?.resumeName || '',
       certificates: existingCertificates,
       updatedAt: new Date().toISOString()
     };
    
    console.log('Saving profile data:', profileData);
    
    // Save to Sanity database
    let savedProfile;
    if (currentProfile?._id) {
      // Update existing profile
      savedProfile = await client.patch(currentProfile._id).set(profileData).commit();
    } else {
      // Create new profile
      savedProfile = await client.create(profileData);
    }
    
    if (savedProfile) {
      console.log('Profile saved successfully:', savedProfile);
      showToast('Profile saved successfully!');
      
      // Update current profile
      currentProfile = savedProfile;
      
             // Update session storage
       const userData = {
         ...JSON.parse(sessionStorage.getItem('renx_cached_user') || '{}'),
         name: profileData.name,
         role: profileData.role,
         bio: profileData.bio,
         photoUrl: profileData.photoUrl,
         resumeUrl: profileData.resumeUrl,
         resumeName: profileData.resumeName,
         certificates: profileData.certificates
       };
       sessionStorage.setItem('renx_cached_user', JSON.stringify(userData));
       
       console.log('Session storage updated with photo URL:', profileData.photoUrl);
      
      // Redirect back to profile page after a short delay
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
    } else {
      throw new Error('Failed to save profile');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    showToast('Error saving profile: ' + error.message);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('Edit profile page loaded');
  
  // Load existing profile data
  loadProfile();
  
     // Photo upload
   if (photoInput) {
     photoInput.addEventListener('change', async (e) => {
       const file = e.target.files[0];
       if (file) {
         try {
           const dataUrl = await fileToDataURL(file);
           photoPreview.src = dataUrl;
           
           // Store the photo data URL in currentProfile
           if (currentProfile) {
             currentProfile.photoUrl = dataUrl;
           } else {
             currentProfile = { photoUrl: dataUrl };
           }
           
           console.log('Photo uploaded and stored:', dataUrl);
           showToast('Photo uploaded successfully');
         } catch (error) {
           console.error('Error uploading photo:', error);
           showToast('Error uploading photo');
         }
       }
     });
   }
  
  // Resume upload
  if (resumeInput) {
    resumeInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const dataUrl = await fileToDataURL(file);
          
          // Store resume data
          if (currentProfile) {
            currentProfile.resumeUrl = dataUrl;
            currentProfile.resumeName = file.name;
          }
          
          // Update UI
          currentResume.href = dataUrl;
          currentResume.textContent = file.name;
          currentResume.classList.remove('hidden');
          
          showToast('Resume uploaded successfully');
        } catch (error) {
          console.error('Error uploading resume:', error);
          showToast('Error uploading resume');
        }
      }
    });
  }
  
  // Certificate upload
  if (certInput) {
    certInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        try {
          // Add new certificates to pending list
          pendingCertificates.push(...files);
          renderCertificates();
          
          showToast(`${files.length} certificate(s) added`);
        } catch (error) {
          console.error('Error adding certificates:', error);
          showToast('Error adding certificates');
        }
      }
    });
  }
  
  // Form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }
      
      try {
        await saveProfile();
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save changes';
        }
      }
    });
  }
  
  console.log('Edit profile event listeners set up');
});

