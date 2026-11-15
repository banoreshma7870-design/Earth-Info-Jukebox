import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import {
  Globe2,
  Waves,
  Mountain,
  Flame,
  Leaf,
  Compass,
  Sparkles,
  Satellite,
  ArrowUpRight,
  Activity,
  Radio,
  Volume2,
  VolumeX,
  MessageSquare,
  X,
  Send,
  Lock,
  Unlock,
  MapPin,
} from "lucide-react";
import "./App.css";
import OrbitalAtlas from "./components/OrbitalAtlas";
import { audio } from "./audio";

interface SatelliteNode {
  id: string;
  title: string;
  agency: string;
  alt: number;
  lat: number;
  lng: number;
  speed: string;
  launchDate: string;
  description: string;
  color: string;
}

interface RegionNode {
  id: string;
  continent: string;
  region: string;
  secrets: string;
  calamities: string;
  species: string;
  nasaData: string;
  questions: string;
  importance: string;
  lat: number;
  lng: number;
  color: string;
}

interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  options?: string[];
}

const CONTINENT_COORDINATES: Record<string, { lat: number; lng: number; altitude: number; minLng: number; maxLng: number }> = {
  "Global View": { lat: 0.0, lng: 0.0, altitude: 2.5, minLng: -180, maxLng: 180 },
  "North America": { lat: 40.0, lng: -100.0, altitude: 1.4, minLng: -170, maxLng: -50 },
  "South America": { lat: -15.0, lng: -60.0, altitude: 1.4, minLng: -90, maxLng: -30 },
  "Europe": { lat: 50.0, lng: 15.0, altitude: 1.4, minLng: -25, maxLng: 45 },
  "Africa": { lat: 0.0, lng: 20.0, altitude: 1.4, minLng: -20, maxLng: 55 },
  "Asia": { lat: 30.0, lng: 90.0, altitude: 1.4, minLng: 45, maxLng: 145 },
  "Australia & Oceania": { lat: -25.0, lng: 135.0, altitude: 1.4, minLng: 110, maxLng: 180 },
  "Antarctica": { lat: -80.0, lng: 0.0, altitude: 1.4, minLng: -180, maxLng: 180 }
};

const PROMINENT_SATELLITES: SatelliteNode[] = [
  { id: "iss", title: "International Space Station (ISS)", agency: "NASA / ESA / Roscosmos", alt: 420, lat: 28.5, lng: -80.6, speed: "27,600 km/h", launchDate: "November 20, 1998", description: "The premier orbital laboratory.", color: "#38bdf8" },
  { id: "hubble", title: "Hubble Space Telescope", agency: "NASA / ESA", alt: 540, lat: 15.0, lng: -45.0, speed: "28,000 km/h", launchDate: "April 24, 1990", description: "Provides deep-space imagery.", color: "#818cf8" },
  { id: "landsat9", title: "Landsat 9", agency: "NASA / USGS", alt: 705, lat: -10.0, lng: 120.0, speed: "27,500 km/h", launchDate: "September 27, 2021", description: "Monitors Earth's land surfaces.", color: "#34d399" },
  { id: "sentinel1", title: "Sentinel-1", agency: "ESA", alt: 693, lat: 45.0, lng: 10.0, speed: "27,400 km/h", launchDate: "April 3, 2014", description: "Provides all-weather radar imaging.", color: "#f59e0b" },
  { id: "jwst", title: "James Webb Space Telescope", agency: "NASA / ESA", alt: 1500, lat: 0.0, lng: -75.0, speed: "10,800 km/h", launchDate: "December 25, 2021", description: "Peering back to the formation of the first galaxies.", color: "#f43f5e" }
];

// --- 100% CUSTOM DATA FROM EXCEL FILE ---
const REGION_DATA: RegionNode[] = [
  { id: "region_0", continent: "Asia", region: "Himalayas & Tibetan Plateau", secrets: "Called the \"Third Pole\": it holds more ice than anywhere outside the polar regions. Marine fossils sit near Everest's summit because it was once seabed, and the range is still rising as India pushes into Asia.", calamities: "Earthquakes (Nepal 2015, M7.8; Tibet Jan 2025, M7.1), glacial-lake outburst floods (Sikkim, Oct 2023), cloudburst flash floods (Kedarnath 2013, Dharali Aug 2025), landslides and land sinking (Joshimath 2023).", species: "Red panda (Endangered), Himalayan musk deer (Endangered), snow leopard (Vulnerable).", nasaData: "GRACE / GRACE-FO (groundwater loss across north India), Landsat & ASTER (glacier and glacial-lake mapping), ICESat-2 (ice height), GPM (monsoon rain), NISAR (NASA–ISRO radar satellite, launched July 2025) for ground movement.", questions: "Is Mount Everest still growing? Why are Himalayan glaciers melting? What causes a cloudburst?", importance: "Feeds the Ganga, Indus, Brahmaputra, Yangtze and Mekong, which give water to over a billion people.", lat: 28.59, lng: 83.93, color: "#f87171" },
  { id: "region_1", continent: "Asia", region: "Sundarbans & Bay of Bengal (India–Bangladesh)", secrets: "World's largest mangrove forest and the only mangrove forest with tigers. They swim between islands and drink salty tidal water.", calamities: "The Bay of Bengal produces the deadliest cyclones on Earth: Bhola 1970 (est. 300,000–500,000 deaths), Amphan 2020, Remal 2024. Storm surges, sea-level rise and salt water are swallowing islands.", species: "Bengal tiger (Endangered), northern river terrapin (Critically Endangered), Ganges river dolphin (Endangered), Irrawaddy dolphin (Endangered).", nasaData: "GPM & MODIS (cyclone tracking), Landsat (50 years of mangrove and island loss), SWOT (river and coastal water levels), Sentinel-6 Michael Freilich (sea level).", questions: "Why are Bay of Bengal cyclones so deadly? Are the Sundarbans islands disappearing? Why do Sundarbans tigers attack people?", importance: "A natural storm shield for Kolkata and Bangladesh, a UNESCO World Heritage site and a huge 'blue carbon' store.", lat: 21.94, lng: 89.18, color: "#f87171" },
  { id: "region_2", continent: "Asia", region: "Ring of Fire: Indonesia–Philippines–Japan", secrets: "Toba supervolcano (Sumatra) erupted ~74,000 years ago, one of the biggest eruptions known. Krakatoa's 1883 blast was heard ~4,800 km away. The Wallace Line splits Asian and Australian wildlife.", calamities: "2004 Indian Ocean tsunami (~230,000 deaths), 2011 Japan M9.0 earthquake & tsunami, frequent eruptions (Anak Krakatau erupting again in 2026), peat fires and haze.", species: "Javan rhino (Critically Endangered, ~50 left, all in one park, Ujung Kulon), Sumatran rhino (Critically Endangered, fewer than 50), Sumatran & Tapanuli orangutans (Critically Endangered).", nasaData: "NASA JPL calculated that the 2011 Japan quake shifted Earth's axis ~17 cm and shortened the day by ~1.8 microseconds. Aura OMI (volcanic SO2), MODIS/VIIRS FIRMS (fires & haze), Landsat.", questions: "Can a supervolcano end the world? Why does Indonesia have so many volcanoes? What is the Ring of Fire?", importance: "Part of the Pacific Ring of Fire, where most of the world's earthquakes and volcanoes occur. The Strait of Malacca is one of the busiest shipping lanes.", lat: 10.0, lng: 130.0, color: "#f87171" },
  { id: "region_3", continent: "Asia", region: "Siberia & Russian Far East", secrets: "Lake Baikal is the oldest (~25 million years) and deepest (1,642 m) lake, holding about a fifth of Earth's unfrozen surface fresh water. The Batagaika crater (the \"gateway to the underworld\") is a growing permafrost slump. The 1908 Tunguska blast flattened ~80 million trees. Frozen mammoths and ancient microbes are emerging from the permafrost.", calamities: "Record wildfires (Yakutia 2021), thawing permafrost sinking buildings and releasing methane, mysterious exploding gas craters on the Yamal peninsula.", species: "Amur leopard (Critically Endangered), Amur/Siberian tiger (Endangered), Siberian crane (Critically Endangered).", nasaData: "MODIS/VIIRS (fire & smoke), Landsat time-lapse of Batagaika's growth (NASA Earth Observatory), OCO-2 & EMIT (carbon and methane), ICESat-2.", questions: "What is the Batagaika crater? Could thawing permafrost release ancient viruses? What caused the Tunguska explosion?", importance: "Permafrost stores roughly twice as much carbon as the atmosphere holds. Its thaw is a global climate risk.", lat: 60.0, lng: 110.0, color: "#f87171" },
  { id: "region_4", continent: "Asia", region: "West Asia (Arabia, Dead Sea, Anatolia)", secrets: "The Dead Sea shore is the lowest land on Earth (~430 m below sea level) and drops about 1 m a year. The Empty Quarter is the largest continuous sand desert. Göbekli Tepe (Turkey) is ~11,500 years old, about 6,000 years older than Stonehenge.", calamities: "Turkey–Syria earthquakes (Feb 2023, M7.8, ~59,000 deaths), record UAE/Oman floods (Apr 2024), dust storms, deadly heat (Hajj 2024).", species: "Arabian leopard (Critically Endangered), Arabian oryx (Vulnerable; brought back after going extinct in the wild).", nasaData: "GPM (desert floods), Landsat (Dead Sea shrinking & sinkholes), EMIT (dust sources and methane plumes from oil & gas), MODIS aerosols (dust storms).", questions: "Why is the Dead Sea shrinking? Why can you float in the Dead Sea? Why did Dubai flood?", importance: "The Persian Gulf has the largest oil & gas reserves, and ~20% of the world's oil passes through the Strait of Hormuz.", lat: 28.0, lng: 45.0, color: "#f87171" },
  { id: "region_5", continent: "Africa", region: "Sahara & Sahel (incl. Lake Chad)", secrets: "The Sahara was green, with lakes and hippos, ~5,000–11,000 years ago. The Eye of the Sahara (Richat Structure, Mauritania) is a ~40 km 'bullseye' that astronauts use as a landmark. Saharan dust crosses the Atlantic and fertilises the Amazon.", calamities: "Desertification, Lake Chad shrinking ~90% since the 1960s, droughts and famine across the Sahel, sandstorms, extreme heat.", species: "Addax (Critically Endangered), dama gazelle (Critically Endangered).", nasaData: "CALIPSO showed ~27.7 million tonnes of Saharan dust reach the Amazon each year. MODIS aerosols, Landsat (Lake Chad shrinking), EMIT (dust minerals), SMAP (soil moisture).", questions: "Was the Sahara ever green? What is the Eye of the Sahara? How does Saharan dust reach America?", importance: "Largest hot desert. Its dust feeds oceans and the Amazon and shapes Atlantic weather.", lat: 18.0, lng: 14.0, color: "#fb923c" },
  { id: "region_6", continent: "Africa", region: "East African Rift (Ethiopia–Kenya–Tanzania–DR Congo)", secrets: "Africa is slowly splitting apart: in 2005 a ~60 km crack opened in Ethiopia's Afar region in days, and a new ocean may form here over millions of years. It's the 'cradle of humankind' (Lucy, 3.2 million years old, Ethiopia; Olduvai Gorge). Lake Kivu holds huge amounts of dissolved gas that could erupt.", calamities: "Volcanic eruptions (Nyiragongo 2021, lava reached Goma), earthquakes, droughts and floods in the Horn of Africa, locust swarms (2019–2021).", species: "Mountain gorilla (Endangered), Ethiopian wolf (Endangered; Africa's rarest carnivore), Grevy's zebra (Endangered).", nasaData: "Landsat & ASTER (rift and volcano mapping), InSAR radar ground motion (NISAR), MODIS thermal hotspots (lava), Aura OMI (volcanic SO2).", questions: "Is Africa splitting in two? Where did humans first evolve? Why is Lake Kivu dangerous?", importance: "The story of human origins, the Great Migration (Serengeti–Maasai Mara), and geothermal power for Kenya.", lat: -2.0, lng: 36.0, color: "#fb923c" },
  { id: "region_7", continent: "Africa", region: "Congo Basin (DR Congo, Congo, Cameroon, Gabon)", secrets: "Hidden peat swamps discovered in 2017 store ~30 billion tonnes of carbon. Kifuka (DR Congo) gets the most lightning in Africa. The Congo is the world's deepest river (over 200 m).", calamities: "River floods, violent thunderstorms and lightning, deforestation and forest fires.", species: "African forest elephant (Critically Endangered), Grauer's (eastern lowland) gorilla (Critically Endangered), bonobo (Endangered), okapi (Endangered).", nasaData: "TRMM Lightning Imaging Sensor mapped the world's lightning hotspots. GEDI (forest height & carbon lidar on the ISS), Landsat (forest loss, used by Global Forest Watch), GPM (rain).", questions: "Which is the second-largest rainforest? Why is the Congo River so deep? What is a bonobo?", importance: "Second-largest rainforest and one of Earth's biggest carbon sinks. DR Congo produces ~70% of the world's cobalt (EV & phone batteries).", lat: -1.0, lng: 22.0, color: "#fb923c" },
  { id: "region_8", continent: "Africa", region: "Madagascar", secrets: "Split from India ~88 million years ago. About 90% of its wildlife lives nowhere else on Earth.", calamities: "Cyclone Freddy (2023), the longest-lasting tropical cyclone on record (~36 days). Drought-driven food crises in the south. Deforestation and erosion turning rivers red.", species: "Over 90% of lemur species are threatened. Silky sifaka & ploughshare tortoise (both Critically Endangered).", nasaData: "GPM & MODIS (cyclone tracking), Landsat (forest loss), astronaut photos from the ISS of red rivers bleeding into the sea.", questions: "Why is Madagascar's wildlife unique? Are lemurs found only in Madagascar? Why is it called the 'red island'?", importance: "One of the world's top biodiversity hotspots.", lat: -18.0, lng: 47.0, color: "#fb923c" },
  { id: "region_9", continent: "Europe", region: "Iceland & Mid-Atlantic Ridge", secrets: "The only place where the Mid-Atlantic Ridge rises above the sea: you can dive between the North American and Eurasian plates at Silfra. The 1783 Laki eruption poisoned the air and caused famine across Europe.", calamities: "Eyjafjallajökull (2010) ash grounded ~100,000 flights. Reykjanes eruptions since 2021 forced Grindavík's evacuation (2023). Glacier outburst floods (jökulhlaups).", species: "Atlantic puffin (Vulnerable globally, Endangered in Europe).", nasaData: "Landsat & ASTER (lava flows, heat), Aura OMI (SO2), MODIS (ash plumes), InSAR/NISAR (ground uplift before eruptions).", questions: "Can you stand between two continents? Why does Iceland have so many volcanoes? Will the volcano erupt again?", importance: "About 9 in 10 Icelandic homes are heated by geothermal energy, making it a model for clean power.", lat: 65.0, lng: -19.0, color: "#facc15" },
  { id: "region_10", continent: "Europe", region: "Mediterranean volcanic belt (Italy–Greece)", secrets: "About 5.5 million years ago the Mediterranean almost dried up, then refilled in a giant flood through Gibraltar. Vesuvius froze Pompeii in ash in 79 AD. Campi Flegrei near Naples is a supervolcano whose ground is rising.", calamities: "Campi Flegrei earthquakes, Etna eruptions, wildfires (Greece), flash floods (Valencia, Spain, Oct 2024), Storm Daniel (2023) devastating Derna, Libya.", species: "Mediterranean monk seal (one of the rarest seals), Balearic shearwater (Critically Endangered), loggerhead turtle (Vulnerable).", nasaData: "ECOSTRESS (heat & drought stress), MODIS/VIIRS FIRMS (wildfires), Landsat, Aura OMI (Etna SO2), GPM (extreme rain).", questions: "Is Campi Flegrei about to erupt? How was Pompeii destroyed? Why is southern Europe getting so hot?", importance: "Cradle of Greek and Roman civilisation, and a climate hotspot warming faster than the global average.", lat: 38.0, lng: 15.0, color: "#facc15" },
  { id: "region_11", continent: "Europe", region: "North Sea & the Low Countries", secrets: "Doggerland, a land where people lived that joined Britain to Europe, drowned under rising seas ~8,000 years ago. European eels swim thousands of km to breed in the Sargasso Sea, yet no one has ever seen them spawn in the wild.", calamities: "The 1953 North Sea flood (~2,500 deaths), storm surges, sea-level rise. About a quarter of the Netherlands lies below sea level.", species: "European eel (Critically Endangered), Atlantic cod (Vulnerable, overfished).", nasaData: "Sentinel-6 Michael Freilich & Jason satellites (sea-level rise, NASA with ESA/NOAA/EUMETSAT), GRACE-FO, SWOT, Landsat (reclaimed land).", questions: "How do the Dutch keep the sea out? What was Doggerland? Where do eels breed?", importance: "World-leading flood defences (Delta Works), Rotterdam (Europe's biggest port), and a hub for offshore wind.", lat: 54.0, lng: 3.0, color: "#facc15" },
  { id: "region_12", continent: "Europe", region: "Arctic Europe (Svalbard & Scandinavia)", secrets: "Svalbard's 'Doomsday' Global Seed Vault stores over a million seed samples as a backup for the world's crops. In 2022 NASA's Endurance rocket, launched from Svalbard, made the first measurement of Earth's hidden global electric field (results published in 2024).", calamities: "The Arctic is warming about 4x faster than the world average: record heat, sea-ice loss, and thawing ground causing landslides and avalanches.", species: "Polar bear (Vulnerable), walrus (Vulnerable).", nasaData: "NASA Endurance sounding rocket, ICESat-2 (sea ice), MODIS, NASA aurora research and sounding rockets from Andøya, Norway.", questions: "Where is the Doomsday Vault? Where is the best place to see the northern lights? Why is the Arctic warming so fast?", importance: "Front line of Arctic climate change and new Arctic shipping routes. The seed vault protects global food security.", lat: 77.0, lng: 15.0, color: "#facc15" },
  { id: "region_13", continent: "North America", region: "Yellowstone (USA)", secrets: "Sits on a supervolcano whose last caldera eruption was ~631,000 years ago. A microbe from its hot springs (Thermus aquaticus) made PCR testing possible, including COVID tests.", calamities: "Hydrothermal explosions (Biscuit Basin, July 2024), earthquake swarms, record floods (June 2022), wildfires (1988).", species: "Grizzly bear (Threatened under US law), whitebark pine (Endangered), gray wolf (reintroduced in 1995).", nasaData: "Landsat thermal mapping of geysers and hot springs. NASA astrobiology studies its heat-loving microbes as clues for life on Mars and Europa. ECOSTRESS.", questions: "Is Yellowstone about to erupt? What would happen if it did? Why is Grand Prismatic Spring so colourful?", importance: "The world's first national park (1872), with the largest concentration of geysers on Earth.", lat: 44.4, lng: -110.5, color: "#34d399" },
  { id: "region_14", continent: "North America", region: "Gulf of Mexico & Caribbean", secrets: "The Chicxulub crater (Yucatán) marks the asteroid that wiped out the dinosaurs 66 million years ago. Bermuda Triangle myths come from nearby waters, though no real mystery has been proven.", calamities: "Hurricane Alley: Katrina (2005), Helene & Milton (2024), and Melissa (Oct 2025), which hit Jamaica as a Category 5 with 185 mph winds. Also a summer 'dead zone' with no oxygen.", species: "Rice's whale (Critically Endangered, ~51 left), Kemp's ridley sea turtle (Critically Endangered).", nasaData: "GOES satellites (with NOAA), GPM (hurricane rain), ISS photos of hurricane eyes, MODIS & PACE (algae blooms, dead zone, oil slicks).", questions: "Why are hurricanes getting stronger? What killed the dinosaurs? Is the Bermuda Triangle real?", importance: "A major US oil & gas region. The nearby Panama Canal links the Atlantic and Pacific.", lat: 25.0, lng: -90.0, color: "#34d399" },
  { id: "region_15", continent: "North America", region: "California & Gulf of California", secrets: "The San Andreas Fault is where the Pacific plate slides past North America by a few cm a year. Death Valley holds the hottest air temperature ever recorded (56.7°C, 1913).", calamities: "Earthquakes (San Francisco 1906), wildfires (Los Angeles, Jan 2025), megadroughts, land sinking from groundwater pumping (Central Valley).", species: "Vaquita (Critically Endangered; only ~7–10 seen in 2025, the world's rarest marine mammal), California condor (Critically Endangered).", nasaData: "Home of NASA JPL (Pasadena). GRACE (Central Valley groundwater loss), FIRMS & ECOSTRESS (fires & heat), UAVSAR & NISAR (fault and land movement), SWOT.", questions: "When will 'the Big One' hit? Why do California wildfires spread so fast? What are Death Valley's sailing stones?", importance: "Silicon Valley (global tech) and the Central Valley, which grows much of America's fruit and vegetables.", lat: 35.5, lng: -120.0, color: "#34d399" },
  { id: "region_16", continent: "North America", region: "Greenland & the North American Arctic", secrets: "Hiawatha crater, a ~31 km asteroid crater hidden under Greenland's ice, was found in 2018 using NASA data. The oldest DNA ever found (2 million years) came from north Greenland.", calamities: "Ice-sheet melt (sea-level rise), landslide tsunamis, permafrost thaw in Alaska & Canada, record Canadian wildfire season (2023).", species: "Polar bear (Vulnerable), Cook Inlet beluga whale (Critically Endangered population, Alaska).", nasaData: "ICESat-2 & GRACE-FO (ice loss), Operation IceBridge (found Hiawatha), OMG (Oceans Melting Greenland), SWOT (recorded the Dickson Fjord wave).", questions: "How much would seas rise if Greenland melted? Why is Greenland called Greenland? What is under Greenland's ice?", importance: "Greenland's ice holds enough water to raise global sea level by ~7 m.", lat: 72.0, lng: -40.0, color: "#34d399" },
  { id: "region_17", continent: "South America", region: "Amazon rainforest", secrets: "Its trees pump 'flying rivers' of moisture that bring rain to the rest of South America. A hidden coral reef at the Amazon's mouth was found in 2016.", calamities: "Record droughts in 2023–2024 (rivers at their lowest levels on record), wildfires, deforestation, floods.", species: "Amazon river dolphin (Endangered), giant otter (Endangered), harpy eagle (Vulnerable).", nasaData: "GEDI (forest height & carbon), Landsat (deforestation), FIRMS (fires), SMAP (soil moisture), OCO-2 (carbon), CALIPSO (Saharan dust feeding the forest).", questions: "Is the Amazon the lungs of the Earth? How much of the Amazon is left? Are there lost cities in the Amazon?", importance: "The largest rainforest, home to ~10% of known species. The Amazon River carries ~20% of the river water that reaches the oceans.", lat: -3.0, lng: -60.0, color: "#38bdf8" },
  { id: "region_18", continent: "South America", region: "Andes & Atacama", secrets: "The Atacama is the driest non-polar desert; some spots have never recorded rain, and NASA tests Mars rovers and life-detection tools there. Hundreds more Nazca Lines (Peru) were found with AI in 2024.", calamities: "The strongest earthquake ever recorded (Chile 1960, M9.5), volcanic eruptions, shrinking glaciers threatening water for Andean cities, El Niño floods.", species: "Andean cat (Endangered), Andean condor (Vulnerable).", nasaData: "NASA's TRMM satellite ranked Lake Maracaibo the world's top lightning spot. NASA Mars-analog research in the Atacama. Landsat (lithium brine ponds, glacier loss), ASTER (volcanoes).", questions: "Why were the Nazca Lines made? Is the Atacama like Mars? What was the strongest earthquake ever?", importance: "The Lithium Triangle holds over half of the world's lithium resources. The Andes are the longest mountain range (~7,000 km), and Chile is the top copper producer.", lat: -22.0, lng: -68.0, color: "#38bdf8" },
  { id: "region_19", continent: "South America", region: "Galápagos Islands (Ecuador)", secrets: "Darwin's observations here shaped the theory of evolution. The islands form over a volcanic hotspot that works like a conveyor belt.", calamities: "El Niño ocean heatwaves that starve seabirds and marine iguanas, volcanic eruptions, invasive species.", species: "Galápagos pink iguana (Critically Endangered), Galápagos penguin (Endangered), several giant tortoise species (Critically Endangered).", nasaData: "Sentinel-6 & MODIS sea-surface temperatures (El Niño), PACE (ocean colour & plankton), Landsat, Aura OMI (eruption SO2).", questions: "Why are Galápagos animals unique? What did Darwin discover there? How does El Niño work?", importance: "A living lab of evolution, a UNESCO World Heritage site and a major marine reserve.", lat: -0.5, lng: -90.5, color: "#38bdf8" },
  { id: "region_20", continent: "South America", region: "Patagonia & the Southern Ice Fields", secrets: "The Southern Patagonian Ice Field is the largest ice mass in the Southern Hemisphere outside Antarctica. Fossils of the biggest dinosaurs ever (Argentinosaurus, Patagotitan) were found here.", calamities: "Fast glacier retreat, glacial-lake outburst floods, fierce winds, wildfires in Chile & Argentina.", species: "Hooded grebe (Critically Endangered), huemul deer (Endangered).", nasaData: "Landsat time series of glacier retreat (NASA Earth Observatory), ICESat-2, GRACE-FO (ice-mass loss).", questions: "Why isn't Perito Moreno glacier shrinking like others? What is the Drake Passage? Where were the biggest dinosaurs found?", importance: "The gateway to Antarctica and a major store of fresh water.", lat: -50.0, lng: -73.0, color: "#38bdf8" },
  { id: "region_21", continent: "Australia / Oceania", region: "Great Barrier Reef (Australia)", secrets: "The largest structure built by living things (~2,300 km long), visible from space.", calamities: "Mass coral bleaching in 2024 (the most widespread on record) and again in 2025, the 6th in 9 years, causing record coral losses. Also cyclones and crown-of-thorns starfish outbreaks.", species: "Hawksbill turtle (Critically Endangered), green turtle (Endangered), dugong (Vulnerable).", nasaData: "The CORAL airborne mission mapped reef health. MODIS and NOAA Coral Reef Watch (ocean heat), PACE (ocean colour), Landsat.", questions: "Is the Great Barrier Reef dying? What causes coral bleaching? Can you see the reef from space?", importance: "UNESCO World Heritage site. Reefs cover under 1% of the ocean but support about a quarter of marine species.", lat: -18.0, lng: 147.0, color: "#a78bfa" },
  { id: "region_22", continent: "Australia / Oceania", region: "Western Australia (Pilbara & Shark Bay)", secrets: "Home to the oldest bits of Earth ever found: 4.4-billion-year-old zircon crystals (Jack Hills). The Pilbara holds ~3.5-billion-year-old traces of microbial life, and living stromatolites still grow at Shark Bay.", calamities: "Tropical cyclones on the Pilbara coast, extreme heat and drought, Ningaloo Reef bleaching (2025).", species: "Western swamp tortoise (Critically Endangered), numbat (Endangered), Australian sea lion (Endangered).", nasaData: "NASA astrobiology uses Pilbara rocks to learn how to spot ancient life on Mars. Landsat & ASTER (geology & mining).", questions: "Where are the oldest rocks on Earth? What are stromatolites? How did life on Earth begin?", importance: "One of the world's biggest sources of iron ore, and a window into how life began.", lat: -23.0, lng: 118.0, color: "#a78bfa" },
  { id: "region_23", continent: "Australia / Oceania", region: "South-East Australia & Tasmania", secrets: "Tasmanian devils suffer from a contagious cancer (devil facial tumour disease), one of very few cancers that spread like an infection.", calamities: "The 'Black Summer' bushfires (2019–20), whose smoke rose into the stratosphere and circled the globe. Major floods (2022), heatwaves, drought.", species: "Leadbeater's possum (Critically Endangered), Tasmanian devil (Endangered), koala (Endangered in Queensland, NSW & ACT under Australian law).", nasaData: "CALIPSO & OMPS tracked Black Summer smoke circling the Earth. MODIS/VIIRS FIRMS (fires), Aura MLS.", questions: "How did the Black Summer fires start? Are koalas going extinct? Why do Tasmanian devils get cancer?", importance: "Home to unique marsupials and the mountain ash, the world's tallest flowering plant.", lat: -37.0, lng: 145.0, color: "#a78bfa" },
  { id: "region_24", continent: "Australia / Oceania", region: "New Zealand & Zealandia", secrets: "Zealandia is a hidden 'eighth continent', about 94% underwater, with New Zealand as its tip. It was fully mapped in 2023.", calamities: "Earthquakes (Christchurch 2011, Kaikōura 2016), the Whakaari/White Island eruption (2019), Cyclone Gabrielle (2023).", species: "Kākāpō (Critically Endangered; a record 2025–26 breeding season lifted numbers to ~325), Māui dolphin (Critically Endangered; the world's rarest dolphin).", nasaData: "NASA launches super-pressure science balloons from Wānaka. Landsat, GPM.", questions: "Is Zealandia a real continent? Why can't kākāpō fly? Is New Zealand due for a big earthquake?", importance: "A geology and conservation showcase, and the last major landmass settled by humans.", lat: -41.0, lng: 174.0, color: "#a78bfa" },
  { id: "region_25", continent: "Australia / Oceania", region: "Pacific Islands, Mariana Trench & Point Nemo", secrets: "The Mariana Trench's Challenger Deep is the deepest point on Earth (~11 km). Point Nemo, the most remote spot in the ocean, is a 'spacecraft cemetery'.", calamities: "The Hunga Tonga eruption (Jan 2022), the largest explosion recorded by modern instruments. Tsunamis, cyclones, and sea-level rise threatening Tuvalu and Kiribati.", species: "Hawaiian monk seal (Endangered), leatherback turtle (West Pacific population Critically Endangered).", nasaData: "NASA measured Hunga Tonga's plume at ~57 km high, and Aura MLS found it added ~10% more water vapour to the stratosphere. Sentinel-6 (sea level).", questions: "What is at the bottom of the Mariana Trench? Where do old satellites go when they die? Will Tuvalu disappear?", importance: "The Pacific is the largest ocean, the core of the Ring of Fire, and on the front line of sea-level rise.", lat: -48.8, lng: -123.3, color: "#a78bfa" },
  { id: "region_26", continent: "Antarctica", region: "East Antarctic Plateau & Lake Vostok", secrets: "The coldest place on Earth: NASA satellite data found surface pockets near −98°C. Lake Vostok lies ~4 km under the ice and has been sealed off for millions of years.", calamities: "An ozone hole forms over Antarctica every spring (Sept–Oct). Extreme cold and winds.", species: "No animals live on the high plateau because it is too cold. Emperor penguins live on its coasts (Near Threatened).", nasaData: "NASA Ozone Watch (Aura OMI & OMPS track the ozone hole every year), Landsat 8 & MODIS (record cold), ICESat-2.", questions: "What is the coldest place on Earth? Is the ozone hole healing? What is hidden under Antarctica's ice?", importance: "Antarctica's ice holds enough water to raise seas by ~58 m, most of it in the east.", lat: -77.5, lng: 106.0, color: "#cbd5e1" },
  { id: "region_27", continent: "Antarctica", region: "West Antarctica & Thwaites 'Doomsday' Glacier", secrets: "Much of this ice sheet rests on bedrock below sea level, so warm ocean water melts it from underneath. Volcanoes are hidden beneath the ice.", calamities: "Thwaites alone could raise sea level by ~65 cm, and the whole West Antarctic ice sheet by ~3.3 m. Ice shelves are collapsing.", species: "Emperor penguin (Near Threatened; listed Threatened in the US). Sea-ice loss in 2022 wiped out chicks at Bellingshausen Sea colonies.", nasaData: "ICESat-2 & GRACE-FO (ice-mass loss), Operation IceBridge (airborne surveys, 2009–2019), NASA JPL ice-flow studies.", questions: "What is the Doomsday Glacier? How fast is Antarctica melting? What happens if Thwaites collapses?", importance: "The biggest wild card for future sea-level rise, putting coastal cities worldwide at risk.", lat: -75.0, lng: -106.0, color: "#cbd5e1" },
  { id: "region_28", continent: "Antarctica", region: "Antarctic Peninsula & Southern Ocean", secrets: "One of the fastest-warming places on Earth. Giant icebergs such as A68 (2017) and A23a (the world's largest) drift north from here.", calamities: "Ice-shelf collapse (Larsen B, 2002), record-low sea ice (2023), a record 18.3°C at Esperanza base (Feb 2020).", species: "Antarctic blue whale (Critically Endangered; the largest animal ever), chinstrap & Adélie penguins, Antarctic krill (the base of the food web).", nasaData: "MODIS & Landsat (watched Larsen B break apart), ICESat-2 (sea-ice thickness), PACE (plankton), NASA Earth Observatory iceberg tracking.", questions: "What is the largest iceberg? Why is Antarctic sea ice shrinking? How big is a blue whale?", importance: "The Southern Ocean absorbs a large share of human-made heat and CO2 and drives global ocean currents.", lat: -69.0, lng: -65.0, color: "#cbd5e1" },
  { id: "region_29", continent: "Antarctica", region: "Ross Sea & McMurdo Dry Valleys", secrets: "Blood Falls: iron-rich salty water pours red out of Taylor Glacier and hosts microbes that live without sunlight. The Dry Valleys are among the most Mars-like places on Earth.", calamities: "Few disasters affect people here. Small Erebus eruptions and fierce katabatic winds.", species: "Weddell seal (the world's southernmost mammal), Antarctic toothfish (heavily fished), emperor penguins.", nasaData: "NASA studies the Dry Valleys and Blood Falls as models for life on Mars and Europa. NASA long-duration science balloons launch from McMurdo. Landsat.", questions: "Why is Blood Falls red? Is there life in Antarctic lakes? Does Mount Erebus spew gold?", importance: "A natural lab for space science. McMurdo is Antarctica's largest research station.", lat: -77.5, lng: 162.0, color: "#cbd5e1" }
];

// --- FACT OR MYTH TRIVIA (used by GAIA ORACLE chatbot) ---
const TRIVIA_QUESTIONS: { statement: string; isFact: boolean; explanation: string }[] = [
  { statement: "Marine fossils can be found near the summit of Mount Everest.", isFact: true, explanation: "FACT. The rocks at Everest's top were once seabed. India's collision with Asia pushed them up, and the Himalayas are still rising." },
  { statement: "The Great Wall of China is easily visible from space with the naked eye.", isFact: false, explanation: "MYTH. The wall is long but very narrow, and its colour blends with the land. Astronauts say it is extremely hard to spot without help." },
  { statement: "The Sahara Desert was once green, with lakes and hippos.", isFact: true, explanation: "FACT. Around 5,000 to 11,000 years ago the 'Green Sahara' had lakes, grasslands and wildlife, before the climate dried out." },
  { statement: "The Amazon rainforest produces 20% of the oxygen we breathe.", isFact: false, explanation: "MYTH. The Amazon's plants make a lot of oxygen, but the forest uses up almost all of it itself. Most of our oxygen comes from ocean plankton." },
  { statement: "Dust from the Sahara helps fertilise the Amazon rainforest.", isFact: true, explanation: "FACT. NASA's CALIPSO satellite showed millions of tonnes of Saharan dust cross the Atlantic each year, carrying phosphorus that feeds the Amazon." },
];

function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const globeContainer = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedContinent, setSelectedContinent] = useState("Global View");
  const [isRotationLocked, setIsRotationLocked] = useState(false);
  
  // Modal States
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteNode | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionNode | null>(null);
  const [satViewOpen, setSatViewOpen] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "ACCESS GRANTED. I am GAIA ORACLE, your tactical AI co-pilot. Want to test your planetary knowledge? Type 'play' or click below to start the Earth Fact or Myth challenge.", options: ["Play Fact or Myth", "Tell me about Gaia Jukebox"] }
  ]);

  const categories = [
    { name: "Ocean Explorer", icon: Waves, detail: "Marine Regions & Calamities" },
    { name: "Earth's Secrets", icon: Mountain, detail: "Tectonic & Terrain Intel" },
    { name: "Planet in Motion", icon: Flame, detail: "NASA Data & Monitoring" },
    { name: "Endangered Species", icon: Leaf, detail: "Habitat & Wildlife" },
    { name: "Satellite Fleet", icon: Satellite, detail: "Top Orbital Nodes" },
  ];

  useEffect(() => {
    if (isLaunched && soundEnabled) audio.playChannelTone(activeTab);
    else audio.stopTone();
  }, [activeTab, isLaunched, soundEnabled]);

  // Globe Initialization
  useEffect(() => {
    if (!isLaunched || !globeContainer.current) return;
    try {
      // @ts-ignore
      const globe = Globe()(globeContainer.current)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#38bdf8")
        .atmosphereAltitude(0.18)
        .pointLat("lat")
        .pointLng("lng")
        .pointRadius("size")
        .pointColor("color")
        .pointAltitude("altitude")
        .pointResolution(16)
        .pointLabel("title")
        .onPointClick((point: any) => {
          if (soundEnabled) audio.playClick();
          if (point) {
            setSelectedSatellite(null); setSelectedRegion(null);
            if (point.satData) {
              setSelectedSatellite(point.satData);
            } else if (point.regionData) {
              setSelectedRegion(point.regionData);
            }
            globe.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 1200);
          }
        });

      globe.width(globeContainer.current.clientWidth);
      globe.height(globeContainer.current.clientHeight);
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globeInstanceRef.current = globe;

      const handleResize = () => {
        if (globeContainer.current && globeInstanceRef.current) {
          globeInstanceRef.current.width(globeContainer.current.clientWidth);
          globeInstanceRef.current.height(globeContainer.current.clientHeight);
        }
      };
      window.addEventListener("resize", handleResize);
      return () => { window.removeEventListener("resize", handleResize); globeInstanceRef.current?._destructor(); };
    } catch (err) { console.error(err); }
  }, [isLaunched]);

  // --- ISOLATED LAYER MANAGEMENT ---
  // Only shows markers based on the exact active channel
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    const globe = globeInstanceRef.current;
    globe.hexBinPointsData([]);
    globe.arcsData([]);
    globe.ringsData([]);

    const currentRegion = CONTINENT_COORDINATES[selectedContinent] || CONTINENT_COORDINATES["Global View"];
    const isFiltered = selectedContinent !== "Global View";

    // 1. ISOLATED EARTH'S SECRETS
    if (activeTab === "Earth's Secrets") {
      const filteredRegions = isFiltered 
        ? REGION_DATA.filter(r => r.lng >= currentRegion.minLng && r.lng <= currentRegion.maxLng)
        : REGION_DATA;

      const points = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, size: 0.9, altitude: 0.05, color: r.color, title: `SECRET: ${r.region}`, regionData: r
      }));
      const rings = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, alt: 0.05, color: r.color
      }));
      
      globe.pointsData(points);
      globe.ringsData(rings);
      globe.ringColor((d: any) => d.color).ringMaxRadius(4).ringPropagationSpeed(1.5).ringRepeatPeriod(1000);
    } 
    // 2. ISOLATED OCEAN EXPLORER (Calamities)
    else if (activeTab === "Ocean Explorer") {
      const filteredRegions = isFiltered 
        ? REGION_DATA.filter(r => r.lng >= currentRegion.minLng && r.lng <= currentRegion.maxLng)
        : REGION_DATA;

      const points = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, size: 0.9, altitude: 0.05, color: "#ef4444", title: `CALAMITY: ${r.region}`, regionData: r
      }));
      const rings = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, alt: 0.05, color: "#ef4444"
      }));
      
      globe.pointsData(points);
      globe.ringsData(rings);
      globe.ringColor((d: any) => d.color).ringMaxRadius(4).ringPropagationSpeed(1.5).ringRepeatPeriod(1000);
    }
    // 3. ISOLATED ENDANGERED SPECIES
    else if (activeTab === "Endangered Species") {
      const filteredRegions = isFiltered 
        ? REGION_DATA.filter(r => r.lng >= currentRegion.minLng && r.lng <= currentRegion.maxLng)
        : REGION_DATA;

      const points = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, size: 0.9, altitude: 0.05, color: "#34d399", title: `SPECIES: ${r.region}`, regionData: r
      }));
      const rings = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, alt: 0.05, color: "#34d399"
      }));
      
      globe.pointsData(points);
      globe.ringsData(rings);
      globe.ringColor((d: any) => d.color).ringMaxRadius(4).ringPropagationSpeed(1.5).ringRepeatPeriod(1000);
    }
    // 4. ISOLATED PLANET IN MOTION (NASA Data)
    else if (activeTab === "Planet in Motion") {
      const filteredRegions = isFiltered 
        ? REGION_DATA.filter(r => r.lng >= currentRegion.minLng && r.lng <= currentRegion.maxLng)
        : REGION_DATA;

      const points = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, size: 0.9, altitude: 0.05, color: "#38bdf8", title: `NASA INTEL: ${r.region}`, regionData: r
      }));
      const rings = filteredRegions.map(r => ({
        lat: r.lat, lng: r.lng, alt: 0.05, color: "#38bdf8"
      }));
      
      globe.pointsData(points);
      globe.ringsData(rings);
      globe.ringColor((d: any) => d.color).ringMaxRadius(4).ringPropagationSpeed(1.5).ringRepeatPeriod(1000);
    }
    // 5. SATELLITE FLEET (Retained)
    else if (activeTab === "Satellite Fleet") {
      const filteredSats = isFiltered ? PROMINENT_SATELLITES.filter(s => s.lng >= currentRegion.minLng && s.lng <= currentRegion.maxLng) : PROMINENT_SATELLITES;
      const satPoints = filteredSats.map(s => ({ lat: s.lat, lng: s.lng, size: 0.8, altitude: 0.15, color: s.color, title: s.title, satData: s }));
      const satRings = filteredSats.map(s => ({ lat: s.lat, lng: s.lng, alt: 0.15, color: s.color }));
      globe.pointsData(satPoints); globe.ringsData(satRings);
      globe.ringColor((d: any) => d.color).ringMaxRadius(5).ringPropagationSpeed(2.5).ringRepeatPeriod(900);
    }
    // Overview or unselected: show nothing or reset
    else {
      globe.pointsData([]); 
    }
  }, [activeTab, selectedContinent]);

  const handleTabChange = (tabName: string) => {
    if (soundEnabled) audio.playClick();
    setActiveTab(tabName);
    setSelectedRegion(null); setSelectedSatellite(null);
  };

  const handleContinentChange = (continent: string) => {
    if (soundEnabled) audio.playClick();
    setSelectedContinent(continent);
    setIsRotationLocked(true);
    const coords = CONTINENT_COORDINATES[continent];
    if (globeInstanceRef.current && coords) {
      globeInstanceRef.current.controls().autoRotate = false;
      globeInstanceRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: coords.altitude }, 1400);
    }
  };

  const toggleRotationLock = () => {
    if (soundEnabled) audio.playClick();
    const newLockState = !isRotationLocked;
    setIsRotationLocked(newLockState);
    if (globeInstanceRef.current) globeInstanceRef.current.controls().autoRotate = !newLockState;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim()) return;
    if (soundEnabled) audio.playClick();
    const newMessages = [...chatMessages, { sender: "user" as const, text }];
    setChatMessages(newMessages);
    setUserInput("");
    
    setTimeout(() => {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("play") || lowerText.includes("fact") || lowerText.includes("myth")) {
        setGameActive(true);
        setCurrentQuestionIndex(0);
        setScore(0);
        const q = TRIVIA_QUESTIONS[0];
        setChatMessages([
          ...newMessages,
          {
            sender: "ai",
            text: `QUESTION 1/5:\n\n"${q.statement}"\n\nIs this a FACT or a MYTH?`,
            options: ["FACT", "MYTH"]
          }
        ]);
      } else if (gameActive && (lowerText === "fact" || lowerText === "myth")) {
        const q = TRIVIA_QUESTIONS[currentQuestionIndex];
        const userGuessedFact = lowerText === "fact";
        const isCorrect = userGuessedFact === q.isFact;
        const updatedScore = isCorrect ? score + 1 : score;
        if (isCorrect) setScore(updatedScore);

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < TRIVIA_QUESTIONS.length) {
          setCurrentQuestionIndex(nextIndex);
          const nextQ = TRIVIA_QUESTIONS[nextIndex];
          setChatMessages([
            ...newMessages,
            {
              sender: "ai",
              text: `${isCorrect ? "✓ CORRECT!" : "✕ INCORRECT!"}\n\n${q.explanation}\n\n--- next question ---\n\nQUESTION ${nextIndex + 1}/5:\n\n"${nextQ.statement}"\n\nIs this a FACT or a MYTH?`,
              options: ["FACT", "MYTH"]
            }
          ]);
        } else {
          setGameActive(false);
          setChatMessages([
            ...newMessages,
            {
              sender: "ai",
              text: `GAME OVER! Final Score: ${updatedScore}/5 correct! 🌟\n\nYou're a certified Earth science expert. Type 'play' if you want another round or ask me anything else about the Jukebox!`
            }
          ]);
        }
      } else {
        setChatMessages([
          ...newMessages,
          {
            sender: "ai",
            text: "GAIA ORACLE online. You can type 'play' to start the Fact or Myth challenge, or select any channel on the left to tune into Earth's live telemetry frequencies."
          }
        ]);
      }
    }, 400);
  };

  if (!isLaunched) {
    return (
      <div className="launch-screen" onClick={() => { setIsLaunched(true); if (soundEnabled) audio.playClick(); }}>
        <nav className="launch-nav"><span className="launch-brand">DEVELOPED BY ORBITAL AUTOBOTS TEAM</span></nav>
        <div className="launch-center-content">
          <span className="launch-subtitle-top">NASA SPACE APPS 2026</span>
          <h1><span className="typewriter-title" style={{ color: '#ffffff' }}>SECRETS OF BREATHING <span style={{ color: '#38bdf8' }}>GAIA</span></span></h1>
          <p className="launch-description">An interactive sonic and visual archive streaming real-time global tracking.</p>
          <button className="launch-cta-btn"><span className="btn-content">INITIALIZE SYSTEM <span className="btn-icon-wrapper"><ArrowUpRight size={16} /></span></span></button>
        </div>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Globe2 size={24} /></div>
          <div><h2>GAIA<span>JUKEBOX</span></h2><p>GLOBAL MONITORING</p></div>
        </div>
        <div className="side-label">NAVIGATION</div>
        <nav className="navigation">
          {["Overview", "Explore Earth", "Discoveries", "Missions"].map((item) => (
            <button key={item} className={`nav-item ${activeTab === item ? "active" : ""}`} onClick={() => handleTabChange(item)}>
              {item === "Overview" ? <Compass size={18} /> : item === "Missions" ? <Satellite size={18} /> : <Globe2 size={18} />} {item}
            </button>
          ))}
        </nav>
        <div className="side-label">JUKEBOX CHANNELS</div>
        <nav className="navigation">
          {categories.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${activeTab === name ? "active" : ""}`} onClick={() => handleTabChange(name)}>
              <Icon size={18} /> {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="nasa-card"><Radio size={18} /><p>Streaming curated intel from NASA</p><span>SYSTEM ACTIVE</span></div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SECRETS OF GAIA</span><span className="slash">/</span><strong>{activeTab.toUpperCase()}</strong></div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => { setIsChatOpen(!isChatOpen); if (soundEnabled) audio.playClick(); }}><MessageSquare size={18} color="#38bdf8" /></button>
            <button className="icon-button" onClick={() => { setSoundEnabled(!soundEnabled); if (!soundEnabled) audio.playClick(); }}>
              {soundEnabled ? <Volume2 size={18} color="#38bdf8" /> : <VolumeX size={18} />}
            </button>
            <div className="status"><span /> SYSTEM ONLINE</div>
            <button
              className="sat-launch-btn"
              onClick={() => { setSatViewOpen(true); if (soundEnabled) audio.playClick(); }}
              title="Launch Orbital Atlas"
            >
              <span className="pulse-dot" />
              <Satellite size={14} />
              Launch Sat View
            </button>
          </div>
        </header>

        <section className="welcome">
          <div><div className="eyebrow"><Sparkles size={14} /> EARTH INFORMATION JUKEBOX</div><h1>Play the pulse of the <span>planet.</span></h1><p>Tune into live environmental tracks, natural phenomena, and global satellite feeds.</p></div>
          <div className="date-chip"><Activity size={15} /> NASA SPACE APPS 2026</div>
        </section>

        <section className="globe-section">
          <div className="globe-heading">
            <div><span className="section-kicker">GLOBAL RADAR & SECTOR LOCK</span><h2>Interactive Global Scope</h2></div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={toggleRotationLock} className={`rotation-lock-btn ${isRotationLocked ? 'locked' : ''}`}>
                {isRotationLocked ? <Lock size={13} /> : <Unlock size={13} />} {isRotationLocked ? "ROTATION LOCKED" : "ORBIT SPINNING"}
              </button>
              <span className="live-tag"><span /> 3D GLOBE SYNC</span>
            </div>
          </div>

          <div className="continent-bar">
            <span className="continent-bar-label"><MapPin size={13} /> SELECT SECTOR:</span>
            <div className="continent-chips">
              {Object.keys(CONTINENT_COORDINATES).map((continent) => (
                <button key={continent} className={`continent-chip ${selectedContinent === continent ? "active" : ""}`} onClick={() => handleContinentChange(continent)}>{continent}</button>
              ))}
            </div>
          </div>

          <div className="globe-stage">
            <div className="globe-canvas" ref={globeContainer} />
            <div className="globe-caption">
              <span>ACTIVE SECTOR: {selectedContinent.toUpperCase()}</span>
              <strong>{isRotationLocked ? "● MODEL LOCKED IN PLACE" : "↻ AUTO-ORBIT ACTIVE"}</strong>
              <small>Select a category on the left, then click a marker to view strict regional intel.</small>
            </div>

            {/* --- STRICTLY ISOLATED DATA MODALS --- */}
            {selectedRegion && (
              <div className="event-modal-overlay">
                <div className="event-modal-card" style={{ borderColor: selectedRegion.color, maxWidth: '500px', maxHeight: '80%', overflowY: 'auto' }}>
                  <div className="modal-header">
                    <span className="event-status" style={{ color: selectedRegion.color }}>● {selectedRegion.continent.toUpperCase()} // REGIONAL INTEL</span>
                    <button className="close-modal" onClick={() => { if (soundEnabled) audio.playClick(); setSelectedRegion(null); }}>✕</button>
                  </div>
                  
                  <h3 style={{ fontSize: '22px' }}>{selectedRegion.region}</h3>
                  
                  <div className="modal-meta-grid" style={{ marginBottom: '12px' }}>
                    <p><strong>COORDS:</strong> {selectedRegion.lat}°N, {selectedRegion.lng}°E</p>
                  </div>

                  {/* EARTH'S SECRETS STRICT RENDERING */}
                  {activeTab === "Earth's Secrets" && (
                    <div className="modal-desc-box">
                      <span className="desc-title">EARTH SECRETS & MYSTERIES</span>
                      <p className="modal-description">{selectedRegion.secrets}</p>
                    </div>
                  )}
                  
                  {/* OCEAN EXPLORER (CALAMITIES) STRICT RENDERING */}
                  {activeTab === "Ocean Explorer" && (
                    <div className="modal-desc-box">
                      <span className="desc-title">NATURAL CALAMITIES</span>
                      <p className="modal-description" style={{ color: '#f87171' }}>{selectedRegion.calamities}</p>
                    </div>
                  )}
                  
                  {/* ENDANGERED SPECIES STRICT RENDERING */}
                  {activeTab === "Endangered Species" && (
                    <div className="modal-desc-box">
                      <span className="desc-title">ENDANGERED SPECIES</span>
                      <p className="modal-description" style={{ color: '#34d399' }}>{selectedRegion.species}</p>
                    </div>
                  )}
                  
                  {/* PLANET IN MOTION (NASA DATA) STRICT RENDERING */}
                  {activeTab === "Planet in Motion" && (
                    <div className="modal-desc-box">
                      <span className="desc-title">NASA MISSIONS & DATA</span>
                      <p className="modal-description" style={{ color: '#38bdf8' }}>{selectedRegion.nasaData}</p>
                    </div>
                  )}

                  <button onClick={() => { if (soundEnabled) audio.playClick(); setSelectedRegion(null); }} className="modal-stream-btn" style={{ background: selectedRegion.color, color: '#000', marginTop: '12px' }}>CLOSE INTEL ↗</button>
                </div>
              </div>
            )}

            {/* SATELLITE MODAL */}
            {selectedSatellite && (
              <div className="event-modal-overlay">
                <div className="event-modal-card" style={{ borderColor: selectedSatellite.color }}>
                  <div className="modal-header"><span className="event-status" style={{ color: selectedSatellite.color }}>● SATELLITE // {selectedSatellite.agency}</span><button className="close-modal" onClick={() => setSelectedSatellite(null)}>✕</button></div>
                  <h3>{selectedSatellite.title}</h3>
                  <div className="modal-desc-box"><span className="desc-title">MISSION OBJECTIVE</span><p className="modal-description">{selectedSatellite.description}</p></div>
                  <button onClick={() => setSelectedSatellite(null)} className="modal-stream-btn" style={{ background: selectedSatellite.color, color: '#000' }}>CLOSE ↗</button>
                </div>
              </div>
            )}

            {/* CHATBOT / FACT OR MYTH DRAWER */}
            {isChatOpen && (
              <div className="event-modal-overlay">
                <div className="event-modal-card" style={{ maxWidth: '480px', height: '560px', display: 'flex', flexDirection: 'column' }}>
                  <div className="modal-header">
                    <span className="event-status">● GAIA ORACLE AI // TRIVIA TERMINAL</span>
                    <button className="close-modal" onClick={() => { if (soundEnabled) audio.playClick(); setIsChatOpen(false); }}><X size={18} /></button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? '#0284c7' : 'rgba(255,255,255,0.06)', border: msg.sender === 'ai' ? '1px solid rgba(56, 189, 248, 0.2)' : 'none', padding: '10px 14px', borderRadius: '8px', maxWidth: '85%', fontSize: '13px', color: '#fff', whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                        <p>{msg.text}</p>
                        {msg.options && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {msg.options.map((opt) => (
                              <button key={opt} onClick={() => handleSendMessage(opt)} style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>{opt}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                    <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type 'play' or answer Fact/Myth..." style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                    <button onClick={() => handleSendMessage()} style={{ background: '#38bdf8', border: 'none', borderRadius: '6px', padding: '0 14px', cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="explore-section">
          <div className="section-title-row">
            <div>
              <span className="section-kicker">CHANNELS</span>
              <h2>Select a frequency</h2>
            </div>
          </div>
          <div className="category-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {categories.map(({ name, icon: Icon, detail }) => (
              <button className="category-card" key={name} onClick={() => handleTabChange(name)}>
                <div className="category-icon"><Icon size={20} /></div>
                <div><h3>{name}</h3><p>{detail}</p></div>
                <ArrowUpRight className="card-arrow" size={16} />
              </button>
            ))}
          </div>
        </section>

        {activeTab === "Satellite Fleet" && (
          <section className="events-section">
            <div className="section-title-row">
              <div><span className="section-kicker">ORBITAL FLEET DATABASE</span><h2>Top Prominent Earth-Observing Satellites</h2></div>
              <span className="live-tag"><span /> ACTIVE SATELLITE LOCK</span>
            </div>
            <div className="events-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {PROMINENT_SATELLITES.map((sat) => (
                <div className="event-card" key={sat.id} onClick={() => { if (soundEnabled) audio.playClick(); setSelectedSatellite(sat); if (globeInstanceRef.current) globeInstanceRef.current.pointOfView({ lat: sat.lat, lng: sat.lng, altitude: 1.5 }, 1200); }} style={{ cursor: 'pointer', borderLeft: `4px solid ${sat.color}` }}>
                  <div><span className="event-status" style={{ color: sat.color }}>● {sat.agency.toUpperCase()}</span><h3>{sat.title}</h3><p style={{ marginTop: '6px' }}>{sat.description}</p></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#38bdf8' }}>ALT: {sat.alt} KM</span>
                    <span className="event-link">INSPECT 3D NODE ↗</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="footer">
          <span>SECRETS OF GAIA © 2026</span>
          <span>BUILT FOR NASA HACKATHON <span className="footer-star">✦</span></span>
        </footer>
      </section>
      {satViewOpen && <OrbitalAtlas onClose={() => setSatViewOpen(false)} />}
    </main>
  );
}

export default App;