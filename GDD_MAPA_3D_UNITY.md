# GDD — Mapa 3D Metrópole Cidade Nova (Port para Unity URP)

**Projeto:** Garagem Conceito 50 · Cidade Nova (Mundo Aberto Estilo GTA)  
**Escala:** `1 unidade = 1 metro` (`1u = 1m`)  
**Passo da Malha Viária:** 6 colunas centrais (`X ∈ {-85, -51, -17, +17, +51, +85}`, `23m × 23m`) + **2 bulevares externos (`X = -148` e `+148`) com 6 quadras largas (`33m × 23m`)** centradas em `X = -125` e `X = +125`.

---

## 1. Relevo Extremo & Sistema de Coordenadas (`cityElevation`)

O mapa possui contraste nítido entre a **parte mais baixa** (Rio `-1.25m` e Cais Baixo `-0.85m`) e a **parte mais alta** (Cidade Alta `+9.00m`, Mirante Alto da Serra Sul `+13.80m` e Serra da Nascente Norte `+26.0m`), ligadas por duas ladeiras contínuas (~11°):

| Faixa `Z` | Setor / Via | Elevação Viária (`cityRoadY`) | Platô / Destaque |
| :--- | :--- | :--- | :--- |
| `Z ∈ [8, 26]` | **Parte Mais Baixa:** Canal do Rio, Cais Baixo (`X = -18, +18`) & Praia Oeste | **`-1.25m`** (água) | **`-0.85m`** (Cais em granito + píer) & **`-0.74m → -2.65m`** (Areia Praia Oeste) |
| `Z >= -39.5` | **Baixada:** Marginal Norte (`34`), Av. Beira-Rio (`0`), Praça/Shopping/Orla (`-17`), Rua das Lojas (`-34`) | **`0.00m`** | **`0.00m`** |
| `-62.5 < Z < -39.5` | **Ladeira 1:** Sobe da Rua das Lojas até a Av. `Z = -68` | **`0.00m → +4.50m`** | **`+2.25m`** (Quadras `Z = -51` com escadas frontais e traseiras) |
| `-73.5 <= Z <= -62.5` | **Patamar Médio:** Av. Panorâmica `Z = -68` + 2 Rotatórias (`-68,-68` e `+68,-68`) | **`+4.50m`** | — |
| `-96.5 < Z < -73.5` | **Ladeira 2:** Sobe da Av. `Z = -68` até a Cidade Alta | **`+4.50m → +9.00m`** | **`+6.75m`** (Residencial 1, **Escola E.M.** `-17,-85` & Parque `+17,-85`) |
| `-130 <= Z <= -96.5` | **Cidade Alta:** Av. Superior `Z = -102` e Residencial 2 (`Z = -119`) | **`+9.00m`** | **`+9.00m`** |
| `Z < -130` | **Parte Urbana Mais Alta:** Rampa panorâmica em `X = 0` até o **Mirante Alto da Serra Sul (`0, -144`)** | **`+9.0m → +13.8m`** | **`+13.80m`** (Mirante de vidro, obelisco, lunetas e Ipês) |

---

## 2. Regras Explícitas de Projeto (Contrato Obrigatório para Unity)

1. **REGRA-01 — Hierarquia Altimétrica Completa (`-0,85m → +13,8m`):** Toda a malha urbana deve seguir `cityRoadY(z)`, `blockTerraceY(z)` e `cityBasinTerrainY(x,z)`, preservando o Cais Baixo (`-0.85m`) e o Mirante Sul (`+13.8m`) como polos extremos acessíveis por escadas e rampa pavimentada, sem degraus acidentais em cruzamentos.
2. **REGRA-02 — Hidrologia Contínua (Nascente + Córrego + Rio + Barcos):** A água nasce na **Nascente da Serra (`+84, +114`)** em paredão rochoso com cachoeira, percorre o **Córrego da Esperança (`creekCenterX`)** entre pedras musgosas, corredeiras e pinguela (`Z = 62`), atravessa a galeria da Marginal Norte (`Z = 34`) e deságua no **Rio Central (`-1.25m`)**, onde operam **5 embarcações reais do catálogo**: `VHC-44` (Lancha Ipanema), `VHC-45` (Jet Ski), `VHC-46` (Bote Resgate), `VHC-47` (Rebocador) navegando + `VHC-50` atracado no píer do Cais Baixo.
3. **REGRA-03 — Vegetação Botânica Multi-Polígono:** É proibido usar árvores ou arbustos de polígono único. Árvores folhosas possuem raízes sapopembas, tronco curvado segmentado, 4 galhos primários, 4 sub-ramos e copa com 13 aglomerados orgânicos de folhas; palmeiras e coqueiros possuem tronco curvo anelado em 9 segmentos, palmito, cacho de cocos e 14 frondes pinadas arqueadas com folíolos; arbustos possuem 7 moitas orgânicas com botões florais.
4. **REGRA-04 — Sinalização Viária Completa & Pontos de Ônibus Modernos:** São obrigatórios **3 pórticos metálicos aéreos** (`vão >= 5,6m`), **5 placas azuis de nome de rua**, **2 totens iluminados de Guia da Cidade**, placas regulamentares/advertência/turísticas (`PARE`, `60 km/h`, `Ladeira 11%`, `Pedestre`, `Área Escolar`, `Proibido Estacionar`, `Nascente & Córrego`, `Mirante Sul`) e **abrigos de ônibus Linha 50** fora da pista com 4 pilares, teto iluminado, vidro temperado, banco apoiado em 3 pés e painel de rotas `MUPI`.
5. **REGRA-05 — Coerência Comercial & Zero Sobreposição Viária:** Nenhuma loja, abrigo ou placa pode bloquear avenidas (`X = -34`, `X = 0`, `X = -162`) ou olhar contra muros de arrimo (`Z = -62.5`) ou fundos de prédios (`Z = -23.5`). Na base do Morro (`Z = 38.8`) são permitidos apenas comércios comunitários autênticos entre os vãos dos escadões.
6. **REGRA-06 — Contraste Socioespacial, Escola Pública & Praia Oeste Ponta Negra:** Preservar a leitura socioespacial entre o Morro da Esperança (`|X| <= 66`), os setores financeiro/residencial e a vida pública compartilhada: **Escola Municipal E.M. Cidade Nova (`-17, -85 @ +6.75m`)** ligada à `Av. Panorâmica (+4.5m)` por escadaria/rampa acessível, com quadra poliesportiva, papelaria de esquina, placas de `Área Escolar` e `Escolar Amarelinho`; e **Praia Oeste (`X < -176.2`, `Z ∈ [-54.5, +11.5]`)** ligada à `Av. Beira-Mar Oeste (-162)` por grande calçadão de 9m (`+0.30m`) em pedra portuguesa, 3 escadarias em granito, praça semicircular estilo Ponta Negra com arco em onda, caminho sinuoso iluminado sobre areia dourada, 7 lojas/quiosques, cadeiras/espreguiçadeiras e ponte em arco até a **Ilha do Sol (`-252, -10`)**.
7. **REGRA-07 — Padrão 3D Obrigatório de Carga, Utilitários & Transporte Pesado (Cabine Vazada, Grade Saliente & Zero Caixas Lisas):** Todos os ônibus (`bus`, `articulated_bus`, `school_bus`), caminhões (`semi_truck`, `dump_truck`, `mixer_truck`, `firetruck`, `tow_truck`) e furgões (`van`, `ambulance`, `armored`, food truck, varredeira) devem ser montados com sub-conjuntos multi-peça obrigatórios: chassi em longarinas + eixo cardã + diferencial traseiro + reservatórios pneumáticos + feixes de molas; **cabine dividida em capô inferior + parede traseira + testeira + colunas A** deixando o **vão do parabrisa 100% vazado e visível com painel e bancos internos** (proibido cubo sólido cobrindo o vidro); **para-lamas dianteiros contornados ao ângulo do capô** (proibido orelhas quadradas nos cantos de vans/ambulâncias); **grade frontal e faróis posicionados à frente do chanfro frontal (`frontZ >= noseMaxZ - 0.005m`)** nunca enterrados na lataria; sanfona plissada de 9 dobras no BRT, pistão hidráulico telescópico e dobradiças na caçamba, aletas helicoidais e escada na betoneira, painel de manômetros/persianas/escada de 15 degraus nos bombeiros, estrobos frontais na ambulância, exaustor de teto/balcão no food truck, estribos laterais no blindado e ciclone de sucção na varredeira.
8. **REGRA-08 — Padrão 3D de Motos/ATV/Trike, Conversíveis (Bancos Padrão VHC-52) & Regra Única Anti-Bug:**
   - **Zero Porta Faltando / Zero Buraco Lateral:** Em todo veículo com portas articuladas (passeio 2P/4P, picapes, furgões e caminhões), o núcleo da cabine/banheira na zona da abertura mede `0,84 × larg`, os para-lamas dianteiros e as colunas/laterais traseiras preenchem `±0,495 × larg` até as extremidades das portas (com pilar B inferior em 4P e soleira contínua), e o pivô da folha da porta fica obrigatoriamente em `X = ±(larg * 0.495 - 0.034)` para fechar 100% rente à lataria, sem buracos abertos nem pintura `two_tone` cortando o interior.
   - **Clearance Obrigatório de Caixa de Roda:** Em esportivos, supercarros e hatches baixos, a altura mínima do topo do para-lama/capô é `wheelRadius * 2 + 0.042m`, garantindo zero pneu atravessando o capô ou o para-lama dianteiro/traseiro.
   - **Conversíveis, Roadsters & Buggys Sem Teto (`VHC-52` como Padrão Único + Zero Peças Flutuantes):** Todos os carros sem teto adotam o **banco concha multi-peça padrão `VHC-52`** (assento anatômico, abas de coxa, encosto reclinado, abas lombares, apoio de cabeça e concha traseira) com variações únicas por modelo (`styleId % 5`: cintos de 4 pontos, costuras plissadas clássicas + hastes cromadas, faixas GT, alça de painel e capotas/lombadas traseiras distintas); `twin_rollbar` ancorado diretamente no convés traseiro (`rearY`, nunca flutuando em `roofY`); retrovisor interno fixado por haste cromada na moldura superior do parabrisa (`topRail`); e `buggy` construído como **cockpit tubular aberto** com gaiola integrada e suspensão aparente.
   - **Motos, Scooters, Trike, Jet Ski & ATV Cyberquad (Guidões Conectados & Retrovisores no Manete):** Todas as motos (`scooter`, `cruiser`, `dirtbike`, `naked`, `sportbike`), `trike`, `atv` e `jetski` exigem **guidão curvado (`TubeGeometry`) fisicamente ligado à mesa superior ou coluna de direção por risers/mesas bilhetadas, clip-ons ou eixo de direção central**, com manoplas, manetes, protetores de mão (cross/ATV) e **retrovisores presos diretamente na abraçadeira do guidão** (zero guidão ou retrovisor flutuando). O `atv` segue o visual multifacetado **Cyberquad** com carenagem e para-lamas angulares, braços duplos `A-arm` + molas helicoidais aparentes, protetor de cárter, quebra-mato integrado e bagageiro traseiro apoiado no chassi.
9. **REGRA-09 — Frota Aérea Escalável: Helicópteros pelo Mapa Mental & Aviões/Jatos Esculpidos (`airVehicles.ts`):**
   - **Helicópteros (`VHC-48, 49, 97, 98, 99, 100`) Sem Bolha Flutuante:** É proibido usar semiesfera gigante flutuando à frente do bico (`Bolha_Cockpit`). Toda aeronave de asas rotativas nasce de uma **banheira de fuselagem esculpida com vão aberto**, **para-brisa envolvente embutido rente às colunas A e montante central**, **janelas inferiores de queixo**, interior visível (bancos anatômicos, manche cíclico e console MFD), conjunto turboeixo duplo superior com bocais e exaustores, rotor articulado com mastro/swashplate/hastes de passo, cone de cauda com estabilizador horizontal + *endplates* e deriva vertical/V-tail ou **Fenestron carenado** (`VHC-97, 99`). Kits obrigatórios por função: **Apache (`VHC-98`)** com `fuseW` desacoplado das asas (`<= 1,36m`), cabine em tandem, radar Longbow no mastro, canhão 30mm + sensor TADS e asas stub-wings recuadas com foguetes Hydra e mísseis Hellfire; **Stealth (`VHC-99`)** com casco facetado e V-tail + Fenestron; **Polícia (`VHC-48`)** com câmera FLIR, holofote Nightsun e corta-fios; **Resgate/Skycrane (`VHC-49, 100`)** com guincho lateral e gancho de carga inferior.
   - **Aviões & Jatos (`VHC-87..96`) com Fuselagem Multi-Seção e Identidade Única:** Substitui o tubo genérico por fuselagens esculpidas com degrau de cabine e para-brisa multi-painel emoldurado (`VHC-87, 88, 90, 91, 92, 96`), canopi em gota com trilho em titânio nos caças (`VHC-93, 94, 95`) e cockpit aberto com motor radial de 7 cilindros + asas N-strut no biplano (`VHC-89`); asas afiladas com flaps, *wingtip pods*, *winglets* e *flap fairings* (`King Air` e `Lear VIP` com cauda em T, `Cargo` com rampa traseira e turbopropulsores com scoop, `F-22` com dupla deriva inclinada e chines stealth, `F-16` com LEX, tomada ventral e tanques/mísseis, `Concorde` com nariz *droop-snoot*, asa duplo delta ogival e 4 turbinas sob a asa).
10. **REGRA-10 — Nova Categoria `Bicicletas` (`VHC-101..105`) com Pedais, Rodas & Guidão Animados:**
   - **Modelos Obrigatórios (baseados no mapa mental):** `VHC-101` (**Normal Trail & Urbana**, quadro diamante + suspensão dianteira), `VHC-102` (**BMX Freestyle**, aro 20 largo, guidão alto em U com barra transversal e 4 *pegs*), `VHC-103` (**Speed / Velocidade**, rodas finas 700c e *drop-bar* com manetes STI), `VHC-104` (**Urbana com Cestas**, quadro *step-through*, cesta dianteira aramada presa ao garfo + bagageiro/cesto traseiro, farol redondo e campainha) e `VHC-105` (**Track Aero GP**, quadro hidroformado e aros profundos `bike_aero`).
   - **Animações Sincronizadas (Web + Unity C#):** (1) **Pedivela & Pedais:** pedivela gira no eixo central enquanto os pedais esquerdo e direito contra-rotacionam mantendo a plataforma nivelada; (2) **Rodas Raiadas:** rotação contínua ao longo da cadência; (3) **Guidão & Garfo Esterçante:** pivô alinhado ao *head-tube* gira suavemente guidão, mesa, garfo, cesta dianteira e roda dianteira juntos.

---

## 3. Zoneamento Estrito, Comércio & Correções do Morro

### 3.1 Shopping, Gastronomia & Moda (Leste · Baixada `0m` e Terraço `+2.25m`)
- **Baixada (`Z = -17`, `0.0m`):** Shopping Metrópole (`+17`), Passarela Aérea (`+34`), Estacionamento com veículos (`+51`), Galeria Moda & Multiplex (`+85`) + **Açaí Tropical** e **Eletrônicos BR** (`Z = -23.5`) rotacionados (`Math.PI`) para abrir frente para a Rua das Lojas (`Z = -34`).
- **Terraço Comercial (`Z = -51`, `+2.25m`, escadas em `Z = -39.5` e `Z = -59.8`):**
  - **Café & Tech (`-17,-51`):** Café Carioca, Cyber 50 (Norte), Express 24H e Barbearia (laterais Leste/Oeste).
  - **Automotivo (`+17,-51`):** Motors 50 (vitrine giratória) e Oficina Turbo (face lateral aberta).
  - **Polo Gastronômico (`+51,-51`):** Burger 50, Pizzaria Nobile (Norte), Churrascaria Brasa (Oeste) e Padaria Pão Quente (Leste).
  - **Polo Moda & Roupa (`+85,-51`):** Moda Urbana, Atelier Vestir (Norte), Tênis & Sneakers (Oeste) e Farmácia Popular (Leste).

### 3.2 Morro da Esperança (`|X| <= 66`) & Comércio Comunitário Autêntico (`Z = 38.8`)
- **4 Lojas Comunitárias Alinhadas (livres de pistas e escadões):**
  - `X = -56.0`: **Mercearia Esperança** (entre Av. `-68` e Escadão `-46`)
  - `X = -24.8`: **Espetinho da Laje** (entre Av. `-34` e Escadão `-16`)
  - `X = +24.4`: **Açaí do Morro** (entre Estrada `+14` e Escadão `+34`)
  - `X = +52.0`: **Corte Real Barber** (entre Av. `+34` e Av. `+68`)
- **5 Segmentos de Muro (`Z = 41.9`):** `[-82,-50]`, `[-42,-20]`, `[-12,9.2]`, `[18.8,30]`, `[38,81]` liberando os 3 escadões (`-46, -16, +34`), a estrada (`+14`) e a saída do Córrego (`+86`).
- **Fundações `hMin..hMax` & Janelas `+Z/-Z`:** Amostragem de 5 pontos (`piso = hMax + 0.14m`, `fundação = hMin - 1.4m`), margem AABB `0.45m` e exclusão de casas/troncos dentro de `dCreek < 4.6m` e `dSpring < 7.2m`.

### 3.3 Escola Pública (`-17, -85`) & Praia Oeste Ponta Negra (`X < -176.2`)
- **E.M. Cidade Nova (`-17, -85 @ +6.75m`):** 2 blocos de aulas em L com telhado cerâmico e varanda sombreada, quadra poliesportiva azul/terracota com tabelas, pórtico iluminado, muro com gradil, escadaria + rampa acessível para `Z = -68`, `Papelaria do Estudante` na esquina e `Escolar Amarelinho (VHC-33)` estacionado fora da faixa ativa.
- **Praia Oeste & Ilha do Sol (`X ∈ [-284, -162]`, `Z ∈ [-54.5, +11.5]`):** Grande calçadão de 9m (`+0.30m`) em pedra portuguesa com ilhas geométricas azuis; **Praça Semicircular Ponta Negra (`-176, -24.5`)** com 4 degraus curvos e arco branco em onda; **3 grandes escadarias** com corrimão em aço descendo até a areia (`-0.74m → -0.90m`); caminho sinuoso iluminado ao longo da enseada; **7 comércios na orla** (`Quiosque Água de Coco`, `Restaurante Maré Alta`, `Sorveteria & Açaí Praia`, `Surf & Moda Praia`, `Quiosque Brisa do Mar`, `Bar do Leme & Petiscos` e `Caiaque & Stand-Up`); 14 conjuntos de espreguiçadeiras/cadeiras articuladas com guarda-sóis e mesas de bistrô; coqueiros botânicos curvos; futevôlei (`-185.6, -34.2`), posto salva-vidas (`-186.5, +2.0`), mar azul-turquesa com 3 ondas animadas e ponte em arco até a **Ilha do Sol (`-252, -10`)**.

### 3.4 Expansão Lateral (`X = ±125`, `33m × 23m`) & Bulevares Externos (`X = ±148`)
- **Prédios Largos de Moradia (2 em 1):** Localizados em `(-125, -51 @ +2.25m)`, `(-125, -85 @ +6.75m)` e `(+125, -85 @ +6.75m)`. Possuem ~30m de largura total com duas alas residenciais unidas por átrio central envidraçado + 3 passarelas elevadas, fundações em granito, gradil e guarita, duas portarias de vidro duplo com marquise, garagens duplas, sacadas com guarda-corpo de vidro, pilhas de condensadores de AC, caixas d'água e chillers.
- **Prédios de Vendas de Empresas com Outdoors & Estacionamentos:** Localizados em `(-125, -17 @ 0.0m)`, `(+125, -17 @ 0.0m)` e `(+125, -51 @ +2.25m)`. Integram torres de vendas com showrooms em vidro duplo, grandes outdoors metálicos iluminados (topo e esquinas) e estacionamentos asfaltados completos com vagas demarcadas, bate-rodas amarelos, guarita, cancela, iluminação LED e veículos estacionados.
- **Malha Viária Estruturada:** Avenidas E–O (`Z = 0, -34, -68, -102`) estendidas até `X = ±153.2`, ligadas aos bulevares N–S externos `X = -148` e `X = +148` com 8 novos cruzamentos, faixas de pedestre, semáforos, postes e tráfego contínuo.

---

## 4. Especificação Técnica de Port para Unity URP

### 4.1 Hierarquia Recomendada de Scene
```text
MetropoleCidadeNova (Root)
├── 00_Sistema/
│   ├── CidadeSemaforoControlador (ciclo 16s + 3 pórticos aéreos + Área Escolar)
│   ├── TrafegoCidade50 (veículos com pitch em ladeira até X=±148 + 5 barcos reais + 2 helis)
│   ├── GeradorDeNpcs (agentes CidadePedestreAgente em -0.85m..+13.8m)
│   └── CidadeOtimizadorRuntime (LODs + GPU Instancing vegetal)
├── 01_Hidrologia_Praia_Cais/ (Cais Baixo -0.85m, Píer, Praia Leste, Rio, Nascente 84,114 e Córrego)
├── 02_Area_Predios_Oeste/ (X = -102..-34 · Y = 0m e +2.25m)
├── 02B_Expansao_MoradiaLarga_e_Vendas/ (X = ±125 · 3 Prédios 2-em-1 + 3 Vendas c/ Outdoors & Estacionamento)
├── 03_Area_Shopping_Comercio/ (Shopping + Gastronomia + Moda + Quiosques + Abrigos MUPI)
├── 04_Residencia_Escola_Mirante/ (Z <= -68 · 10 quadras + E.M. Cidade Nova + Mirante Sul +13.8m)
└── 05_Morro_Esperanca_Norte/ (Maciço |X|<=66, Lojas Base, 5 Muros, 3 Escadões, Córrego)
```

### 4.2 Colliders, Água, Física em Ladeira & NavMesh
- **Água & Barcos:** `CidadeAguaAnimada` com scroll contínuo de UV nos dois eixos (`offset.x` e `-offset.y`) aplicado ao Rio (`Y = -1.25m`), Baía Oeste, Córrego e Nascente; `CidadeTriggerAgua` cobrindo o canal navegável e zona rasa da Praia Oeste (`X < -191`).
- **Tráfego em Ladeira (`TrafegoCidade50`):** Atualizar `transform.position.y = cityRoadY(z) + 0.04f` e inclinar `rotation.x = -dir * Mathf.Atan(cityRoadSlopeDZ(z))` ao cruzar `Z ∈ [-96.5, -39.5]` inclusive nos bulevares `X = ±148`.
- **NavMesh (`Humanoid`, `Max Slope = 42°`, `Step Height = 0.45m`):** Incluir `OffMeshLinks` nas escadas do Cais Baixo (`Z = 5.4..6.8`), nas 3 escadarias e anfiteatro da Praia Oeste (`X = -176.2`), escada/rampa da Escola (`-17, -73.5`), escadarias comerciais (`Z = -39.5` e `Z = -59.8`), Passarela (`+34,-17`), pinguela do Córrego (`Z = 62`) e base dos 3 Escadões (`Z = 42`).

### 4.3 Contrato Único de Frota 3D (`Fabrica50Veiculos.cs` + `builders/`)
- **Regra Única de Portas, Conversíveis & Lataria:** Nunca posicionar portas fora ou recuadas para dentro da banheira; toda folha de porta articulada orbita em `X = ±(larg * 0.495 - 0.034)` com núcleo de cabine/banheira recuado para `0,84 × larg`. Todo conversível/roadster/buggy utiliza banco concha multi-peça padrão `VHC-52` diferenciado por veículo, `Santantonio` ancorado em `beltY`/`rearY`, `Retrovisor_Interno` preso na moldura do parabrisa e `buggy` em cockpit tubular aberto.
- **Regra Única de Carga & Pesados:** `MontarVeiculoTerrestre` espelha `heavyVehicles.ts` (cabine com vão aberto de parabrisa mostrando painel/bancos, para-lamas contornados sem orelhas quadradas, grade/faróis salientes à frente do capô, eixo cardã, diferencial, degraus, pistão hidráulico de caçamba, funil/escada da betoneira, manômetros dos bombeiros, teto médico e estrobos SAMU).
- **Regra Única de Motos, Trike & ATV Cyberquad:** `MontarMotoOuAtv` espelha `specialVehicles.ts` com 5 arquétipos de 2 rodas + `atv` estilo Cyberquad (carenagem e para-lamas angulares, braços A-arm + amortecedores) + `trike`, sempre com **risers/colunas de direção ligando mesa/carenagem ao guidão** e **retrovisores ancorados no manete** (zero peças flutuantes).
- **Regra Única da Frota Aérea (`airVehicles.ts` + `MontarHelicoptero` / `MontarAviaoOuJato`):** Proibido usar semiesfera gigante flutuando como bolha de helicóptero ou tubo contínuo genérico em aviões. Todos os 6 helicópteros (`VHC-48, 49, 97..100`) e 10 aviões/jatos (`VHC-87..96`) mantêm para-brisa/canopi embutido na moldura estrutural, interior detalhado visível e kits aerodinâmicos individuais.
- **Regra Única da Categoria `Bicicletas` (`bicycleVehicles.ts` + `MontarBicicleta`):** Inclui Normal/Trail (`VHC-101`), BMX Freestyle (`VHC-102`), Speed (`VHC-103`), Urbana com Cestas (`VHC-104`) e Track Aero (`VHC-105`), sempre com rodas raiadas finas (`bike_spoke`/`bike_aero`), corrente, pedivela + pedais nivelados animados e pivô do guidão girando garfo, cesta dianteira e roda frontal em `ControleVeiculo50`.
