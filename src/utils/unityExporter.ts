import { VehicleConcept } from '../types/vehicle';
import { thumbnailRenderer } from '../three/studioScene';

function sanitizeClassName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '');
}

export function generateUnityCSharpForVehicle(v: VehicleConcept): string {
  const safeName = sanitizeClassName(v.name);
  const { length, width, height, wheelbase } = v.dimensions;
  const [camX, camY, camZ] = v.unitySpec.cameraOffset;
  const isBoat = v.unitySpec.controlType === 'BarcoControle';
  const isAir = v.unitySpec.controlType === 'AeronaveControle';
  const isMoto = v.unitySpec.controlType === 'MotoControle';
  const isPlaneOrJet = v.geometry.archetype === 'airplane' || v.geometry.archetype === 'jet';

  return `using UnityEngine;

/// <summary>
/// Concept Art ${v.code} — ${v.name} (${v.tierClass ?? v.category})
/// Rank Unity: ${v.performanceRank ?? 'Padrão'}
/// Classificação: ${v.classificationDescription ?? v.conceptSummary}
/// Papel na Cidade: ${v.roleInCity}
/// Compatível com EntrarSairCarro.cs e AparenciaPersonagem.cs
/// </summary>
public class Gerador_${safeName} : MonoBehaviour
{
    [Header("Identificação, Classificação & Física")]
    public string codigoModelo = "${v.code}";
    public string nomeVeiculo = "${v.name}";
    public string classeUnity = "${v.tierClass ?? v.category}";
    public string rankDesempenho = "${v.performanceRank ?? 'Padrão'}";
    [TextArea(2, 4)]
    public string descricaoClassificacao = "${(v.classificationDescription ?? v.conceptSummary).replace(/"/g, '\\"')}";
    public float velocidadeMaxKmh = ${v.unitySpec.maxSpeedKmh}f;
    public float aceleracao = ${v.unitySpec.acceleration}f;
    public float massaKg = ${v.unitySpec.massKg}f;
    public int assentos = ${v.unitySpec.seats};

    [Header("Paleta Conceito")]
    public string hexPrimaria = "${v.palette.primary}";
    public string hexSecundaria = "${v.palette.secondary}";
    public string hexDestaque = "${v.palette.accent}";

    private static Shader shaderBase;

    [ContextMenu("Gerar Modelo ${v.code}")]
    public GameObject GerarVeiculo()
    {
        GameObject raiz = new GameObject("${v.code}_${safeName}");
        raiz.transform.position = transform.position;
        raiz.transform.rotation = transform.rotation;

        Rigidbody rb = raiz.AddComponent<Rigidbody>();
        rb.mass = massaKg;
        rb.interpolation = RigidbodyInterpolation.Interpolate;
        ${isBoat ? 'rb.useGravity = true; // Integrar com CidadeTriggerAgua.cs para flutuabilidade' : isAir ? 'rb.useGravity = true; // Controlado por sustentação de AeronaveControle' : ''}

        BoxCollider col = raiz.AddComponent<BoxCollider>();
        col.size = new Vector3(${width.toFixed(2)}f, ${height.toFixed(2)}f, ${length.toFixed(2)}f);
        col.center = new Vector3(0f, ${(height * 0.5).toFixed(2)}f, 0f);

        Color corPrimaria = Hex(hexPrimaria);
        Color corSecundaria = Hex(hexSecundaria);
        Color corDestaque = Hex(hexDestaque);
        Color corInterior = Hex("${v.palette.interior}");
        Color corVidro = new Color(0.55f, 0.78f, 0.94f, 0.42f);
        Color corPneu = new Color(0.11f, 0.11f, 0.12f);

        // 1. Carroceria Principal (${length.toFixed(2)}m x ${width.toFixed(2)}m)
        float alturaBase = ${(height * (1 - v.geometry.cabinHeightRatio) * 0.85).toFixed(2)}f;
        float clear = ${v.geometry.groundClearance.toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "Carroceria_Base", raiz.transform,
            new Vector3(0f, clear + alturaBase * 0.5f, 0f),
            new Vector3(${isPlaneOrJet ? (width * 0.18).toFixed(2) : width.toFixed(2)}f, alturaBase, ${length.toFixed(2)}f), corPrimaria);

        // 2. Cabine Transparente & Interior (${v.palette.interior})
        float alturaCabine = ${(height * v.geometry.cabinHeightRatio).toFixed(2)}f;
        float compCabine = ${(length * v.geometry.cabinLengthRatio).toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "Bancos_Interior", raiz.transform,
            new Vector3(0f, clear + alturaBase + 0.16f, 0f),
            new Vector3(${(width * (isPlaneOrJet ? 0.12 : 0.64)).toFixed(2)}f, 0.34f, ${(length * v.geometry.cabinLengthRatio * 0.65).toFixed(2)}f), corInterior);
        CriarPeca(PrimitiveType.Cube, "Cabine_Vidro_Transparente", raiz.transform,
            new Vector3(0f, clear + alturaBase + alturaCabine * 0.45f, 0f),
            new Vector3(${(width * (isPlaneOrJet ? 0.15 : 0.86)).toFixed(2)}f, alturaCabine, compCabine), corVidro);
${
  isPlaneOrJet
    ? `
        // Asas e Empenagem (${v.geometry.archetype})
        CriarPeca(PrimitiveType.Cube, "Asas_Principais", raiz.transform,
            new Vector3(0f, clear + alturaBase * 0.75f, 0.1f),
            new Vector3(${width.toFixed(2)}f, 0.12f, ${(length * 0.22).toFixed(2)}f), corPrimaria);
        CriarPeca(PrimitiveType.Cube, "Deriva_Vertical", raiz.transform,
            new Vector3(0f, clear + alturaBase + 0.65f, -${(length * 0.40).toFixed(2)}f),
            new Vector3(0.10f, 1.25f, ${(length * 0.16).toFixed(2)}f), corDestaque);`
    : `
        // 3. Para-choques, Retrovisores e Escapamentos
        CriarPeca(PrimitiveType.Cube, "Parachoque_Dianteiro", raiz.transform,
            new Vector3(0f, clear + 0.12f, ${(length * 0.5 + 0.04).toFixed(2)}f),
            new Vector3(${(width * 0.96).toFixed(2)}f, 0.14f, 0.12f), corSecundaria);
        CriarPeca(PrimitiveType.Cube, "Parachoque_Traseiro", raiz.transform,
            new Vector3(0f, clear + 0.12f, -${(length * 0.5 + 0.04).toFixed(2)}f),
            new Vector3(${(width * 0.96).toFixed(2)}f, 0.14f, 0.12f), corSecundaria);
        CriarPeca(PrimitiveType.Cube, "Retrovisor_E", raiz.transform,
            new Vector3(-${(width * 0.54).toFixed(2)}f, clear + alturaBase + 0.08f, ${(length * 0.14).toFixed(2)}f),
            new Vector3(0.14f, 0.08f, 0.10f), corPrimaria);
        CriarPeca(PrimitiveType.Cube, "Retrovisor_D", raiz.transform,
            new Vector3(${(width * 0.54).toFixed(2)}f, clear + alturaBase + 0.08f, ${(length * 0.14).toFixed(2)}f),
            new Vector3(0.14f, 0.08f, 0.10f), corPrimaria);
        CriarPeca(PrimitiveType.Cylinder, "Escapamento_E", raiz.transform,
            new Vector3(-${(width * 0.28).toFixed(2)}f, clear + 0.06f, -${(length * 0.51).toFixed(2)}f),
            new Vector3(0.08f, 0.12f, 0.08f), corDestaque);
        CriarPeca(PrimitiveType.Cylinder, "Escapamento_D", raiz.transform,
            new Vector3(${(width * 0.28).toFixed(2)}f, clear + 0.06f, -${(length * 0.51).toFixed(2)}f),
            new Vector3(0.08f, 0.12f, 0.08f), corDestaque);`
}

        // 4. Faróis e Lanternas
        float fX = ${(width * (isPlaneOrJet ? 0.06 : 0.34)).toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "Farol_E", raiz.transform,
            new Vector3(-fX, clear + alturaBase * 0.6f, ${(length * 0.5 + 0.01).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.10f, 0.06f), new Color(1f, 0.97f, 0.82f));
        CriarPeca(PrimitiveType.Cube, "Farol_D", raiz.transform,
            new Vector3(fX, clear + alturaBase * 0.6f, ${(length * 0.5 + 0.01).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.10f, 0.06f), new Color(1f, 0.97f, 0.82f));
${
  wheelbase > 0 && v.geometry.wheelRadius > 0
    ? `
        // 5. Conjunto de Rodas (Entre-eixos ${wheelbase.toFixed(2)}m)
        float rRoda = ${v.geometry.wheelRadius.toFixed(2)}f;
        float lRoda = ${v.geometry.wheelWidth.toFixed(2)}f;
        float zEixo = ${(wheelbase * 0.5).toFixed(2)}f;
        ${
          isMoto
            ? `CriarRoda("Roda_Dianteira", raiz.transform, new Vector3(0f, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_Traseira", raiz.transform, new Vector3(0f, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);`
            : `float xRoda = ${(width * (isPlaneOrJet ? 0.14 : 0.46)).toFixed(2)}f;
        CriarRoda("Roda_FE", raiz.transform, new Vector3(-xRoda, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_FD", raiz.transform, new Vector3(xRoda, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_TE", raiz.transform, new Vector3(-xRoda, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_TD", raiz.transform, new Vector3(xRoda, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);`
        }`
    : `
        // 5. Módulo Propulsão Especial (${v.unitySpec.driveType})
        CriarPeca(PrimitiveType.Cylinder, "Propulsor_Principal", raiz.transform,
            new Vector3(0f, ${(height * 0.65).toFixed(2)}f, -${(length * 0.35).toFixed(2)}f),
            new Vector3(0.45f, 0.30f, 0.45f), corDestaque);`
}

        // 6. Integração com EntrarSairCarro.cs
        EntrarSairCarro entrar = raiz.AddComponent<EntrarSairCarro>();
        entrar.offsetCameraCarro = new Vector3(${camX}f, ${camY}f, ${camZ}f);
        entrar.offsetSaida = new Vector3(-${(width * 0.5 + 1.1).toFixed(2)}f, 0.5f, 0f);

        return raiz;
    }

    private void CriarRoda(string nome, Transform pai, Vector3 pos, float raio, float largura, Color pneu, Color aro)
    {
        GameObject r = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        r.name = nome;
        DestroyImmediate(r.GetComponent<Collider>());
        r.transform.SetParent(pai, false);
        r.transform.localPosition = pos;
        r.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        r.transform.localScale = new Vector3(raio * 2f, largura * 0.5f, raio * 2f);
        r.GetComponent<Renderer>().sharedMaterial = PegarMaterial(pneu, 0.15f);

        GameObject calota = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        calota.name = nome + "_Aro";
        DestroyImmediate(calota.GetComponent<Collider>());
        calota.transform.SetParent(r.transform, false);
        calota.transform.localScale = new Vector3(0.62f, 1.04f, 0.62f);
        calota.GetComponent<Renderer>().sharedMaterial = PegarMaterial(aro, 0.7f);
    }

    private Transform CriarPeca(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 escala, Color cor)
    {
        GameObject go = GameObject.CreatePrimitive(tipo);
        go.name = nome;
        DestroyImmediate(go.GetComponent<Collider>());
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = escala;
        go.GetComponent<Renderer>().sharedMaterial = PegarMaterial(cor, 0.55f);
        return go.transform;
    }

    private static Material PegarMaterial(Color cor, float smoothness)
    {
        if (shaderBase == null) shaderBase = Shader.Find("Universal Render Pipeline/Lit");
        if (shaderBase == null) shaderBase = Shader.Find("Standard");
        Material m = new Material(shaderBase);
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", cor);
        if (m.HasProperty("_Color")) m.SetColor("_Color", cor);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
        return m;
    }

    private static Color Hex(string h) { Color c; ColorUtility.TryParseHtmlString(h, out c); return c; }
}
`;
}

export function generateFullCatalogScriptableObject(vehicles: VehicleConcept[]): string {
  const entries = vehicles
    .map(
      (v) =>
        `        new SpecVeiculoConceito { codigo = "${v.code}", nome = "${v.name}", categoria = "${v.category}", classeUnity = "${v.tierClass ?? v.category}", rankDesempenho = "${v.performanceRank ?? 'Padrão'}", descricao = "${(v.classificationDescription ?? v.conceptSummary).replace(/"/g, '\\"')}", comprimento = ${v.dimensions.length}f, largura = ${v.dimensions.width}f, altura = ${v.dimensions.height}f, velMaxKmh = ${v.unitySpec.maxSpeedKmh}f, aceleracao = ${v.unitySpec.acceleration}f, massaKg = ${v.unitySpec.massKg}f, corHex = "${v.palette.primary}", zonaSpawn = "${v.unitySpec.spawnZone}" }`,
    )
    .join(',\n');

  return `using UnityEngine;

[System.Serializable]
public struct SpecVeiculoConceito
{
    public string codigo;
    public string nome;
    public string categoria;
    public string classeUnity;
    public string rankDesempenho;
    public string descricao;
    public float comprimento;
    public float largura;
    public float altura;
    public float velMaxKmh;
    public float aceleracao;
    public float massaKg;
    public string corHex;
    public string zonaSpawn;
}

/// <summary>
/// Catálogo completo dos ${vehicles.length} veículos de Concept Art para o projeto Cidade.
/// </summary>
public class Catalogo50VeiculosConceito : MonoBehaviour
{
    public SpecVeiculoConceito[] veiculos = new SpecVeiculoConceito[]
    {
${entries}
    };
}
`;
}

export async function exportConceptArtSheetPng(v: VehicleConcept): Promise<void> {
  const shots = thumbnailRenderer.renderFourAngleSheet(v);

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [imgHero, imgSide, imgFront, imgTop] = await Promise.all([
    loadImg(shots.hero),
    loadImg(shots.side),
    loadImg(shots.front),
    loadImg(shots.top),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;

  // Studio dark slate background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 1600, 960);

  // Subtle blueprint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1600; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 960);
    ctx.stroke();
  }
  for (let y = 0; y <= 960; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1600, y);
    ctx.stroke();
  }

  // Header
  ctx.fillStyle = '#f59e0b';
  ctx.font = '600 18px sans-serif';
  ctx.fillText(`${v.code}  ·  ${v.category.toUpperCase()}`, 48, 54);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = '700 44px sans-serif';
  ctx.fillText(v.name, 48, 102);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '400 18px sans-serif';
  ctx.fillText(v.conceptSummary.slice(0, 118), 48, 136);

  // Main Hero 3/4 panel
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 164, 960, 560);
  ctx.drawImage(imgHero, 48, 164, 960, 560);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 14px monospace';
  ctx.fillText('PERSPECTIVA 3/4 STUDIO', 64, 190);

  // Right orthographic angles
  const drawSmallShot = (img: HTMLImageElement, label: string, y: number) => {
    ctx.strokeStyle = '#27272a';
    ctx.strokeRect(1032, y, 520, 174);
    ctx.drawImage(img, 1032, y, 520, 174);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 13px monospace';
    ctx.fillText(label, 1048, y + 24);
  };

  drawSmallShot(imgSide, 'VISTA LATERAL (1:1)', 164);
  drawSmallShot(imgFront, 'VISTA FRONTAL', 356);
  drawSmallShot(imgTop, 'VISTA SUPERIOR', 548);

  // Footer Specs Strip
  ctx.strokeStyle = '#27272a';
  ctx.strokeRect(48, 748, 1504, 168);
  ctx.fillStyle = '#111115';
  ctx.fillRect(49, 749, 1502, 166);

  const specs = [
    ['DIMENSÕES (C × L × A)', `${v.dimensions.length.toFixed(2)}m × ${v.dimensions.width.toFixed(2)}m × ${v.dimensions.height.toFixed(2)}m`],
    ['CONTROLADOR UNITY', `${v.unitySpec.controlType} · ${v.unitySpec.driveType}`],
    ['DESEMPENHO', `${v.unitySpec.maxSpeedKmh} km/h · Massa ${v.unitySpec.massKg} kg`],
    ['SPAWN NA CIDADE', v.unitySpec.spawnZone],
  ];

  specs.forEach(([k, val], idx) => {
    const sx = 72 + idx * 372;
    ctx.fillStyle = '#71717a';
    ctx.font = '600 13px sans-serif';
    ctx.fillText(k, sx, 784);
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '600 18px monospace';
    ctx.fillText(val.slice(0, 34), sx, 814);
  });

  // Crafted parts line
  ctx.fillStyle = '#f59e0b';
  ctx.font = '600 13px sans-serif';
  ctx.fillText('PEÇAS MODELADAS:', 72, 862);
  ctx.fillStyle = '#d4d4d8';
  ctx.font = '400 15px sans-serif';
  ctx.fillText(v.craftedParts.join('  ·  ').slice(0, 148), 72, 888);

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${v.code}_${sanitizeClassName(v.name)}_ConceptArt.png`;
  a.click();
}
