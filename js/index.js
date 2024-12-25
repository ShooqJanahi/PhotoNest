//============================ FLOATING NAV
const floatingNavs = document.querySelectorAll('.floatingNav a')
const removeActiveNavs = () => {
    floatingNavs.forEach(nav => {
        nav.classList.remove('active')
    })
}

floatingNavs.forEach(nav => {
    nav.addEventListener('click', () => {
        removeActiveNavs();
        nav.classList.add('active')
    })
})


/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
// const sections = document.querySelectorAll('section[id]')
    
// const scrollActive = () =>{
//   	const scrollDown = window.scrollY

// 	sections.forEach(current =>{
// 		const sectionHeight = current.offsetHeight,
// 			  sectionTop = current.offsetTop,
// 			  sectionId = current.getAttribute('id'),
// 			  sectionsClass = document.querySelector('.floatingNav a[href*=' + sectionId + ']')

// 		if(scrollDown > sectionTop && scrollDown <= sectionTop + sectionHeight){
// 			sectionsClass.classList.add('active')
// 		}else{
// 			sectionsClass.classList.remove('active')
// 		}                                                    
// 	})
// }
// window.addEventListener('scroll', scrollActive)

















//============================ Join us
const resumeRight = document.querySelector('.resume__right')
const experienceContent = `<h4>Feature</h4>
                <p>PhotoNest stands out with its cutting-edge features designed to make photo management as intuitive and enjoyable as possible.</p>
                <ul>
                    <li>
                        <h5>Efficient, Quick & Reliable</h5>
                        <p>PhotoNest is designed for speed and efficiency, ensuring that your photos are organized and accessible with just a few clicks. </p>
                    </li>
                    <li>
                        <h5>Smart Tagging</h5>
                        <p>Automatically tag and categorize your photos by date, location, and people, making it easier than ever to find what you're looking for.</p>
                    </li>
                    <li>
                        <h5>Advanced Search</h5>
                        <p>Easily search your photo collection using multiple criteria, allowing you to find the right photos quickly and efficiently.</p>
                    </li>
                    <li>
                        <h5>Share Moments with Ease</h5>
                        <p>Whether it's a special occasion or everyday moments, PhotoNest allows you to effortlessly share your photos with friends and family, creating lasting memories together.</p>
                    </li>
                </ul>`

const experienceBtn = document.querySelector('.experience__btn')
experienceBtn.addEventListener('click', () => {
    resumeRight.innerHTML = experienceContent;
    resumeRight.className = 'resume__right'
    experienceBtn.classList.add('primary')
        // remove classes from other buttons
        aboutBtn.classList.remove('primary')
        educationBtn.classList.remove('primary')
        skillsBtn.classList.remove('primary')
})

// set experience content as the default content resume right when the page loads
resumeRight.innerHTML = experienceContent;




const educationContent = `<h4>Organization</h4>
                <p>From personal galleries to professional portfolios, managing your memories has never been simpler.</p>
                <ul>
                    <li>
                        <h5>Cloud Storage & Backup</h5>
                        <p>
                            Keep all your photos safe and accessible with secure cloud storage. Automatic backups ensure your business never loses important images or media files.
                        </p>
                    </li>
                    
                </ul>`
const educationBtn = document.querySelector('.education__btn')
educationBtn.addEventListener('click', () => {
    resumeRight.innerHTML = educationContent;
    resumeRight.className = 'resume__right education'
    educationBtn.classList.add('primary')
        // remove classes from other buttons
        experienceBtn.classList.remove('primary')
        aboutBtn.classList.remove('primary')
        skillsBtn.classList.remove('primary')
})




const skillsContent = `
<h4>Privacy & Security</h4>
                <p>"Commitment to Your Privacy" At PhotoNest, safeguarding your personal data and photos is our top priority.</p>
                <ul>
                    <li>
                        <h5>Data Encryption</h5>
                        <p>
                            Your photos and personal information are protected by industry-leading encryption methods, ensuring that only you and your trusted contacts have access to your files.
                        </p>
                    </li>

                    <li>
                        <h5>Custom Privacy Settings</h5>
                        <p>
                            Control who can see your photos with customizable privacy settings. You can share your images with specific groups, friends, or keep them completely private.
                        </p>
                    </li>

                   


                </ul>`

const skillsBtn = document.querySelector('.skills__btn')
skillsBtn.addEventListener('click', () => {
    resumeRight.innerHTML = skillsContent;
    resumeRight.className = "resume__right skills"
    skillsBtn.classList.add('primary')
        // remove classes from other buttons
        experienceBtn.classList.remove('primary')
        educationBtn.classList.remove('primary')
        aboutBtn.classList.remove('primary')
})




const aboutContent = `
<h4>About Us</h4>
                <p>Learn more about PhotoNest, where we treasure your memories as much as you do. Our platform is built on the foundation of trust and user satisfaction, ensuring that every moment captured is preserved with the utmost care and respect.</p>
                <ul>
                    <li>
                        <h5>Our Mission</h5>
                        <p>
                            At PhotoNest, we believe in the power of memories. Our mission is to provide a platform where users can easily organize, store, and share their most cherished moments with loved ones, all while ensuring privacy and security.
                        </p>
                    </li>

                    <li>
                        <h5>What We Offer</h5>
                        <p>
                           PhotoNest offers a seamless experience to categorize and organize photos, advanced search tools, and smart tagging, making it simple for users to find and share memories. Whether you're a casual user or a professional, PhotoNest is designed with your needs in mind.
                        </p>
                    </li>


                    <li>
                        <h5>Why Choose Us?</h5>
                        <p>
                            With an intuitive interface, powerful organizational tools, and secure sharing options, PhotoNest is the perfect solution for anyone looking to manage their digital photo collection. Our commitment to privacy, efficiency, and reliability makes us stand out from the rest.
                        </p>
                    </li>

                    <li>
                        <h5>Join Our Community</h5>
                        <p>
                            Become part of a growing community that values organization and memories. At PhotoNest, we aim to connect people through shared experiences, offering a platform where users can relive and share their stories with others.
                        </p>
                    </li>
                </ul>`


    const aboutBtn = document.querySelector('.about__btn')
    aboutBtn.addEventListener('click', () => {
        resumeRight.innerHTML = aboutContent;
        resumeRight.className = "resume__right about"
        aboutBtn.classList.add('primary')
        // remove classes from other buttons
        experienceBtn.classList.remove('primary')
        educationBtn.classList.remove('primary')
        skillsBtn.classList.remove('primary')
    })




















//============================ MIXITUP (projects section)
const containerEl = document.querySelector('.projects__container');
let mixer = mixitup(containerEl, {
    animation: {
        enable: false
    }
});

mixer.filter('*');


















//============================ SWIPER (testimonials section) 
const swiper = new Swiper('.swiper', {
    slidesPerView: 1,
    spaceBetween: 30,
    pagination: {
        el: ".swiper-pagination",
        clickable: true
    },

    breakpoints: {
        600: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        }
    }
    });

















//============================ ACCORDION
const faqs = document.querySelectorAll('.faqs__item');

faqs.forEach(faq => {
    faq.addEventListener('click', () => {
        const p = faq.querySelector('p');
        const icon = faq.querySelector('.faq__icon')
        if(p.classList.contains('show')) {
            p.classList.remove('show')
            icon.innerHTML = `<i class="uil uil-angle-down"></i>`
        } else {
            p.classList.add('show')
            icon.innerHTML = `<i class="uil uil-angle-up"></i>`
        }
    })
})












// =================================== THEME
const themeToggler = document.querySelector('.nav__theme-btn');

if (themeToggler) { // Check if themeToggler exists
    themeToggler.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme-variables');
        if (document.body.className == '') {
            themeToggler.innerHTML = `<i class="uil uil-moon"></i>`;
            window.localStorage.setItem('portfolio-theme', '');
        } else {
            themeToggler.innerHTML = `<i class="uil uil-sun"></i>`;
            window.localStorage.setItem('portfolio-theme', 'dark-theme-variables');
        }
    });
}

// use theme from local storage on page load
const bodyClass = window.localStorage.getItem('portfolio-theme');
document.body.className = bodyClass;
