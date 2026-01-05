import { dataService } from './data_service.js';
import { aiAnalyzer } from './ai_analyzer.js';
import { CONFIG } from './config.js';

export class UIController {
    constructor() {
        this.gallery = document.getElementById('gallery-container');
        this.sentinel = document.getElementById('loading-sentinel');
        this.searchOverlay = document.getElementById('search-overlay');
        this.detailModal = document.getElementById('detail-modal');
        this.modalContent = document.getElementById('modal-content');
        this.osdViewer = null;
        
        this.initEventListeners();
        this.initIntersectionObserver();
    }

    initEventListeners() {
        document.getElementById('search-trigger').addEventListener('click', () => this.toggleSearch(true));
        document.getElementById('search-close').addEventListener('click', () => this.toggleSearch(false));
        
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('modal-backdrop').addEventListener('click', () => this.closeModal());
        document.addEventListener('close-artwork-modal', () => this.closeModal());

        document.querySelectorAll('#filter-class button, #filter-period button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const isActive = e.target.classList.contains('bg-black');
                e.target.parentElement.querySelectorAll('button').forEach(b => {
                    b.classList.remove('bg-black', 'text-white');
                });
                if (!isActive) {
                    e.target.classList.add('bg-black', 'text-white');
                }
                this.handleSearch(document.getElementById('search-input').value);
            });
        });
    }

    initIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.loadMore();
            }
        }, { threshold: 0.1 });
        observer.observe(this.sentinel);
    }

    loadMore() {
        const items = dataService.getNextBatch();
        items.forEach(item => this.renderArtworkCard(item));
    }

    renderArtworkCard(item) {
        const card = document.createElement('div');
        card.className = 'artwork-card fade-in';
        card.innerHTML = `
            <div class="image-container mb-4">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='${CONFIG.IMAGE_FALLBACK}'">
            </div>
            <h3 class="text-md font-bold leading-snug uppercase tracking-tight">${item.title}</h3>
            <p class="text-gray-500 font-sans text-xs mt-1">${item.artist}</p>
        `;
        card.addEventListener('click', () => this.openDetail(item));
        this.gallery.appendChild(card);
    }

    toggleSearch(show) {
        if (show) {
            this.searchOverlay.classList.remove('hidden');
            gsap.to(this.searchOverlay, { opacity: 1, duration: 0.4, ease: "power2.out" });
            document.body.classList.add('search-active');
            document.getElementById('search-input').focus();
        } else {
            gsap.to(this.searchOverlay, { opacity: 0, duration: 0.3, onComplete: () => {
                this.searchOverlay.classList.add('hidden');
                document.body.classList.remove('search-active');
            }});
        }
    }

    handleSearch(query) {
        const activeClass = document.querySelector('#filter-class .bg-black')?.innerText;
        const activePeriod = document.querySelector('#filter-period .bg-black')?.innerText;
        
        const results = dataService.search(query, {
            classification: activeClass,
            period: activePeriod
        });

        this.gallery.innerHTML = '';
        results.forEach(item => this.renderArtworkCard(item));
    }

    async openDetail(item) {
        this.detailModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        

        const iiifBase = item.image.split('/full/')[0];
        const iiifManifest = `${iiifBase}/info.json`;

        this.modalContent.innerHTML = `
            <div class="flex-1 relative bg-gray-50 border-r border-gray-100 h-1/2 md:h-full">
                <div id="osd-viewer" class="w-full h-full"></div>
                
                <div class="absolute top-6 left-6 z-20">
                     <button onclick="window.closeModal()" class="p-3 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-white transition-all">
                        <i data-lucide="arrow-left" class="w-6 h-6"></i>
                    </button>
                </div>

                <div class="osd-custom-controls">
                    <button id="zoom-in" class="osd-btn"><i data-lucide="zoom-in" class="w-5 h-5"></i></button>
                    <button id="zoom-out" class="osd-btn"><i data-lucide="zoom-out" class="w-5 h-5"></i></button>
                    <button id="home" class="osd-btn"><i data-lucide="maximize" class="w-5 h-5"></i></button>
                </div>
            </div>

            <div class="w-full md:w-[450px] lg:w-[550px] bg-white h-full overflow-y-auto sidebar-scroll flex flex-col">
                <div class="p-8 md:p-12">
                    <div class="mb-10">
                        <span class="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">${item.classification}</span>
                        <h2 class="text-4xl font-serif mt-2 mb-2 leading-tight">${item.title}</h2>
                        <h3 class="text-xl text-nga-purple font-medium">${item.artist}</h3>
                        <p class="text-gray-500 font-sans mt-1 italic">${item.date}</p>
                    </div>

                    <div class="space-y-8">
                        <section>
                            <h4 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 border-b pb-2">Analysis & Insights</h4>
                            <div id="ai-analysis" class="text-gray-700 leading-relaxed font-sans text-sm md:text-base">
                                <div class="flex gap-2 items-center text-gray-400 italic">
                                    <div class="animate-pulse bg-gray-200 h-4 w-4 rounded-full"></div>
                                    Synthesizing curatorial data...
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 border-b pb-2">History & Background</h4>
                            <div class="space-y-4">
                                <details class="group">
                                    <summary class="flex justify-between items-center cursor-pointer list-none py-2 font-medium">
                                        <span>Provenance</span>
                                        <i data-lucide="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform"></i>
                                    </summary>
                                    <div class="pt-2 text-sm text-gray-600 leading-relaxed">
                                        ${item.provenance || 'Provenance records for this artwork are currently being digitized by the NGA archives.'}
                                    </div>
                                </details>
                                <details class="group">
                                    <summary class="flex justify-between items-center cursor-pointer list-none py-2 font-medium">
                                        <span>Exhibition History</span>
                                        <i data-lucide="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform"></i>
                                    </summary>
                                    <div class="pt-2 text-sm text-gray-600 leading-relaxed">
                                        ${item.exhibitions || 'This work has been featured in numerous central gallery rotations and specialized exhibitions since its acquisition.'}
                                    </div>
                                </details>
                            </div>
                        </section>

                        <section class="pt-8">
                            <h4 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-6 border-b pb-2">Related Works</h4>
                            <div class="recommendations-grid" id="recommendations">
                                <!-- Recommended works -->
                            </div>
                        </section>

                        <div class="pt-10 flex flex-col gap-3">
                            <a href="${item.image}" download class="w-full py-4 bg-black text-white text-center text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-all">Download Image</a>
                            <button class="w-full py-4 border border-gray-200 text-sm font-bold uppercase tracking-widest hover:border-black transition-all">Cite this Work</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        lucide.createIcons();
        gsap.to(this.modalContent, { x: 0, duration: 0.6, ease: "power4.out" });


        this.osdViewer = OpenSeadragon({
            id: "osd-viewer",
            prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
            tileSources: iiifManifest,
            showNavigationControl: false,
            gestureSettingsMouse: { clickToZoom: true, scrollToZoom: true },
            animationTime: 0.5,
            blendingTime: 0.1,
            constrainDuringPan: true,
            visibilityRatio: 1
        });


        document.getElementById('zoom-in').onclick = () => this.osdViewer.viewport.zoomBy(1.5);
        document.getElementById('zoom-out').onclick = () => this.osdViewer.viewport.zoomBy(1/1.5);
        document.getElementById('home').onclick = () => this.osdViewer.viewport.goHome();


        aiAnalyzer.analyzeArtwork(item).then(analysis => {
            const el = document.getElementById('ai-analysis');
            if (el) el.innerHTML = `<p class="italic">"${analysis}"</p>`;
        });


        this.renderRecommendations(item);
    }

    renderRecommendations(item) {
        const related = dataService.getRelatedArtworks(item);
        const container = document.getElementById('recommendations');
        related.forEach(art => {
            const div = document.createElement('div');
            div.className = 'cursor-pointer group';
            div.innerHTML = `
                <div class="aspect-square bg-gray-50 overflow-hidden mb-2">
                    <img src="${art.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <h5 class="text-[10px] font-bold uppercase truncate">${art.title}</h5>
            `;
            div.onclick = () => this.openDetail(art);
            container.appendChild(div);
        });
    }

    closeModal() {
        if (this.osdViewer) {
            this.osdViewer.destroy();
            this.osdViewer = null;
        }
        gsap.to(this.modalContent, { x: '100%', duration: 0.5, ease: "power4.in", onComplete: () => {
            this.detailModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }});
    }
}
