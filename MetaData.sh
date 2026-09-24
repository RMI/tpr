#!/bin/bash

Rscript scripts/prep_scripts/prep_pathwayMetadata.R

rm src/data/1.json
rm src/data/2.json
rm src/data/3.json

# mv src/data/1.json src/data/iea/IEA-APS-2024.json
# mv src/data/2.json src/data/iea/IEA-STEPS-2024.json
# mv src/data/3.json src/data/iea/IEA-NZE-2024.json

rm src/data/4.json
rm src/data/5.json
rm src/data/6.json

# mv src/data/4.json src/data/philippines-ministry-of-energy/PMoE-Reference-2023.json
# mv src/data/5.json src/data/philippines-ministry-of-energy/PMoE-CES1-2023.json
# mv src/data/6.json src/data/philippines-ministry-of-energy/PMoE-CES2-2023.json

rm src/data/7.json
rm src/data/8.json
rm src/data/9.json
rm src/data/10.json

# mv src/data/7.json src/data/asean-centre-for-energy/ACE-BAS-2024.json
# mv src/data/8.json src/data/asean-centre-for-energy/ACE-ATS-2024.json
# mv src/data/9.json src/data/asean-centre-for-energy/ACE-RAS-2024.json
# mv src/data/10.json src/data/asean-centre-for-energy/ACE-CNS-2024.json


rm src/data/11.json
rm src/data/12.json
rm src/data/13.json

rm src/data/14.json
rm src/data/15.json
rm src/data/16.json
rm src/data/17.json
rm src/data/18.json

rm src/data/19.json

# mv src/data/19.json src/data/jetp-id/jetp-cipp-2024.json

rm src/data/20.json
rm src/data/21.json
rm src/data/22.json

# mv src/data/20.json src/data/un-sdsn-cw/SDSN_CW-EP_MY-2024.json
# mv src/data/21.json src/data/un-sdsn-cw/SDSN_CW-MAP_MY-2024.json
# mv src/data/22.json src/data/un-sdsn-cw/SDSN_CW-MAP1_MY-2024.json

rm src/data/23.json
rm src/data/24.json
rm src/data/25.json
rm src/data/26.json

# mv src/data/23.json src/data/transitionzero/TZ-BAU-2024.json
# mv src/data/24.json src/data/transitionzero/TZ-EBAU-2024.json
# mv src/data/25.json src/data/transitionzero/TZ-REGI-2024.json
# mv src/data/26.json src/data/transitionzero/TZ-ISG-2024.json

rm src/data/27.json
rm src/data/28.json
rm src/data/29.json
rm src/data/30.json
rm src/data/31.json
rm src/data/32.json
rm src/data/33.json

# mv src/data/27.json src/data/ngfs/NGFS-LD-2024.json
# mv src/data/28.json src/data/ngfs/NGFS-NZ2050-2024.json
# mv src/data/29.json src/data/ngfs/NGFS-B2DS-2024.json
# mv src/data/30.json src/data/ngfs/NGFS-DT-2024.json
# mv src/data/31.json src/data/ngfs/NGFS-NDC-2024.json
# mv src/data/32.json src/data/ngfs/NGFS-CP-2024.json
# mv src/data/33.json src/data/ngfs/NGFS-FW-2024.json

rm src/data/34.json
rm src/data/35.json
rm src/data/36.json
rm src/data/37.json
rm src/data/38.json
rm src/data/39.json
rm src/data/40.json

# mv src/data/41.json src/data/un-sdsn-cw/EXT-TH-2024.json
# mv src/data/42.json src/data/un-sdsn-cw/MAP-TH-2024.json
# mv src/data/43.json src/data/un-sdsn-cw/NZE-TH-2024.json

rm src/data/41.json
rm src/data/42.json
rm src/data/43.json

# mv src/data/44.json src/data/un-sdsn-cw/SDSN-CW-SEP-PH-2024.json
# mv src/data/45.json src/data/un-sdsn-cw/SDSN-CW-OEP-PH-2024.json
# mv src/data/46.json src/data/un-sdsn-cw/SDSN-CW-MAP1-PH-2024.json
# mv src/data/47.json src/data/un-sdsn-cw/SDSN-CW-MAP2-PH-2024.json

rm src/data/44.json
rm src/data/45.json
rm src/data/46.json
rm src/data/47.json

# mv src/data/48.json src/data/un-sdsn-cw/SDSN-CW-EPP-MM-2024.json
# mv src/data/49.json src/data/un-sdsn-cw/SDSN-CW-OEPP-MM-2024.json
# mv src/data/50.json src/data/un-sdsn-cw/SDSN-CW-OMAP-MM-2024.json

rm src/data/48.json
rm src/data/49.json
rm src/data/50.json

# mv src/data/51.json src/data/un-sdsn-cw/SDSN-CW-BAS-SG-2024.json
# mv src/data/52.json src/data/un-sdsn-cw/SDSN-CW-BAU-SG-2024.json
# mv src/data/53.json src/data/un-sdsn-cw/SDSN-CW-HA1S-SG-2024.json
# mv src/data/54.json src/data/un-sdsn-cw/SDSN-CW-HA2S-SG-2024.json
# mv src/data/55.json src/data/un-sdsn-cw/SDSN-CW-HA1O-SG-2024.json
# mv src/data/56.json src/data/un-sdsn-cw/SDSN-CW-HA2O-SG-2024.json

npm run format
