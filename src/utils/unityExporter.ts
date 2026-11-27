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
  const isBike = v.geometry.archetype === 'bicycle' || v.category === 'Bicicletas';
  const isPlaneOrJet = v.geometry.archetype === 'airplane' || v.geometry.archetype === 'jet';

  return `using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

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
    private static readonly Dictionary<long, Material> cacheMateriais = new Dictionary<long, Material>();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetarCache()
    {
        cacheMateriais.Clear();
        shaderBase = null;
    }

    [ContextMenu("Gerar Modelo ${v.code}")]
    public GameObject GerarVeiculo()
    {
        GameObject raiz = new GameObject("${v.code}_${safeName}");
        raiz.transform.position = transform.position;
        raiz.transform.rotation = transform.rotation;

        Rigidbody rb = raiz.AddComponent<Rigidbody>();
        rb.mass = massaKg;
        rb.interpolation = RigidbodyInterpolation.Interpolate;
        rb.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
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

        // Grupos nomeados padronizados (Regra Suprema GDD -> facilita achar e animar cada peça no Unity)
        Transform grupoChassi = CriarGrupo(raiz.transform, "Grupo_Chassi");
        Transform grupoInterior = CriarGrupo(raiz.transform, "Grupo_Interior");
        Transform grupoVidros = CriarGrupo(raiz.transform, "Grupo_Vidros");
        Transform grupoLuzes = CriarGrupo(raiz.transform, "Grupo_Farois_Lanternas");
        Transform grupoPortas = CriarGrupo(raiz.transform, "Grupo_Portas");
        Transform grupoCapo = CriarGrupo(raiz.transform, "Grupo_Capo");
        Transform grupoRodas = CriarGrupo(raiz.transform, "Grupo_Rodas");

        // 1. Carroceria Principal (${length.toFixed(2)}m x ${width.toFixed(2)}m)
        float alturaBase = ${(height * (1 - v.geometry.cabinHeightRatio) * 0.85).toFixed(2)}f;
        float clear = ${v.geometry.groundClearance.toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "${isBike ? 'Quadro_Principal' : 'Carroceria_Base'}", grupoChassi,
            new Vector3(0f, clear + alturaBase * 0.5f, 0f),
            new Vector3(${isPlaneOrJet ? (width * 0.18).toFixed(2) : isBike ? '0.08' : width.toFixed(2)}f, ${isBike ? '0.18' : 'alturaBase'}, ${isBike ? (wheelbase * 0.72).toFixed(2) : length.toFixed(2)}f), corPrimaria);

        // 2. Interior, Bancos & Volante / Guidão com pivô padronizado (${v.palette.interior})
        float alturaCabine = ${(height * v.geometry.cabinHeightRatio).toFixed(2)}f;
        float compCabine = ${(length * v.geometry.cabinLengthRatio).toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "${isBike ? 'Selim_Bike' : 'Bancos_Interior'}", grupoInterior,
            new Vector3(0f, clear + alturaBase + 0.16f, ${isBike ? '-0.18f' : '0f'}),
            new Vector3(${(width * (isPlaneOrJet ? 0.12 : isBike ? 0.25 : 0.64)).toFixed(2)}f, ${isBike ? '0.06' : '0.34'}f, ${(isBike ? 0.25 : length * v.geometry.cabinLengthRatio * 0.65).toFixed(2)}f), corInterior);
        ${
          isBike
            ? `Transform guidaoPivo = CriarGrupo(grupoInterior, "Guidao_Pivo");
        guidaoPivo.localPosition = new Vector3(0f, clear + alturaBase + 0.34f, ${(wheelbase * 0.34).toFixed(2)}f);
        CriarPeca(PrimitiveType.Cylinder, "Guidao_Barra", guidaoPivo,
            Vector3.zero,
            new Vector3(0.03f, ${(width * 0.45).toFixed(2)}f, 0.03f), corSecundaria).localRotation = Quaternion.Euler(0f, 0f, 90f);`
            : `Transform volantePivo = CriarGrupo(grupoInterior, "Volante_Pivo");
        volantePivo.localPosition = new Vector3(-${(width * (isPlaneOrJet ? 0.0 : isMoto ? 0.0 : 0.22)).toFixed(2)}f, clear + alturaBase + 0.18f, ${(length * 0.16).toFixed(2)}f);
        volantePivo.localRotation = Quaternion.Euler(24f, 0f, 0f);
        CriarPeca(PrimitiveType.Cylinder, "Volante_Aro", volantePivo,
            Vector3.zero,
            new Vector3(0.32f, 0.025f, 0.32f), new Color(0.14f, 0.15f, 0.18f)).localRotation = Quaternion.Euler(90f, 0f, 0f);

        CriarPeca(PrimitiveType.Cube, "Cabine_Vidro_Transparente", grupoVidros,
            new Vector3(0f, clear + alturaBase + alturaCabine * 0.45f, 0f),
            new Vector3(${(width * (isPlaneOrJet ? 0.15 : 0.86)).toFixed(2)}f, alturaCabine, compCabine), corVidro);`
        }
${
  isPlaneOrJet
    ? `
        // Asas e Empenagem (${v.geometry.archetype})
        CriarPeca(PrimitiveType.Cube, "Asas_Principais", grupoChassi,
            new Vector3(0f, clear + alturaBase * 0.75f, 0.1f),
            new Vector3(${width.toFixed(2)}f, 0.12f, ${(length * 0.22).toFixed(2)}f), corPrimaria);
        CriarPeca(PrimitiveType.Cube, "Deriva_Vertical", grupoChassi,
            new Vector3(0f, clear + alturaBase + 0.65f, -${(length * 0.40).toFixed(2)}f),
            new Vector3(0.10f, 1.25f, ${(length * 0.16).toFixed(2)}f), corDestaque);`
    : isBike
      ? `
        // 3. Pedivela, Coroa e Pedais (pivô no eixo central)
        Transform pedivelaPivo = CriarGrupo(grupoChassi, "Pedivela_Pivo");
        pedivelaPivo.localPosition = new Vector3(0f, clear + 0.04f, -0.05f);
        CriarPeca(PrimitiveType.Cylinder, "Coroa_Pedivela", pedivelaPivo,
            new Vector3(0.04f, 0f, 0f),
            new Vector3(0.16f, 0.02f, 0.16f), corDestaque).localRotation = Quaternion.Euler(0f, 0f, 90f);`
      : `
        // 3. Grade Texturizada com Filetes, Entrada Inferior, Faróis de Neblina, Retrovisores, Maçanetas, Limpadores, Frisos, Antena & Panel Gaps
        Color corPretoFosco = new Color(0.08f, 0.08f, 0.10f);
        Color corRecorte = new Color(0.03f, 0.03f, 0.04f);
        CriarPeca(PrimitiveType.Cube, "Grade_Frontal", grupoChassi,
            new Vector3(0f, clear + alturaBase * 0.56f, ${(length * 0.5 + 0.015).toFixed(2)}f),
            new Vector3(${(width * 0.46).toFixed(2)}f, ${(Math.max(0.09, height * 0.12)).toFixed(2)}f, 0.05f), corPretoFosco);
        for (int fg = -1; fg <= 1; fg++)
        {
            CriarPeca(PrimitiveType.Cube, "Filete_Grade_" + (fg + 1), grupoChassi,
                new Vector3(0f, clear + alturaBase * 0.56f + fg * 0.035f, ${(length * 0.5 + 0.025).toFixed(2)}f),
                new Vector3(${(width * 0.43).toFixed(2)}f, 0.014f, 0.045f), new Color(0.12f, 0.13f, 0.15f));
        }

        CriarPeca(PrimitiveType.Cube, "Parachoque_Dianteiro", grupoChassi,
            new Vector3(0f, clear + 0.10f, ${(length * 0.5 - 0.02).toFixed(2)}f),
            new Vector3(${(width * 0.96).toFixed(2)}f, 0.14f, 0.12f), corSecundaria);
        CriarPeca(PrimitiveType.Cube, "Parachoque_Traseiro", grupoChassi,
            new Vector3(0f, clear + 0.10f, -${(length * 0.5 - 0.02).toFixed(2)}f),
            new Vector3(${(width * 0.96).toFixed(2)}f, 0.14f, 0.12f), corSecundaria);
        CriarPeca(PrimitiveType.Cube, "Entrada_Ar_Inferior", grupoChassi,
            new Vector3(0f, clear + 0.085f, ${(length * 0.5 + 0.025).toFixed(2)}f),
            new Vector3(${(width * 0.52).toFixed(2)}f, 0.072f, 0.052f), corPretoFosco);
        CriarPeca(PrimitiveType.Cube, "Antena_Teto", grupoChassi,
            new Vector3(0f, clear + alturaBase + alturaCabine + 0.032f, -${(length * 0.14).toFixed(2)}f),
            new Vector3(0.032f, 0.068f, 0.15f), corPretoFosco);
        CriarPeca(PrimitiveType.Cube, "Friso_Janela_Superior_PB", grupoChassi,
            new Vector3(0f, clear + alturaBase + alturaCabine - 0.03f, ${(length * 0.12).toFixed(2)}f),
            new Vector3(${(width * 0.78).toFixed(2)}f, 0.020f, 0.030f), corPretoFosco);
        for (int w = -1; w <= 1; w += 2)
        {
            CriarPeca(PrimitiveType.Cube, w < 0 ? "Limpador_Parabrisa_E" : "Limpador_Parabrisa_D", grupoChassi,
                new Vector3(w * ${(width * 0.17).toFixed(2)}f, clear + alturaBase + 0.03f, ${(length * 0.22).toFixed(2)}f),
                new Vector3(0.28f, 0.014f, 0.020f), corPretoFosco).localRotation = Quaternion.Euler(0f, 0f, 5f);
        }
        CriarPeca(PrimitiveType.Cylinder, "Escapamento_E", grupoChassi,
            new Vector3(-${(width * 0.28).toFixed(2)}f, clear + 0.06f, -${(length * 0.51).toFixed(2)}f),
            new Vector3(0.08f, 0.12f, 0.08f), corDestaque);
        CriarPeca(PrimitiveType.Cylinder, "Escapamento_D", grupoChassi,
            new Vector3(${(width * 0.28).toFixed(2)}f, clear + 0.06f, -${(length * 0.51).toFixed(2)}f),
            new Vector3(0.08f, 0.12f, 0.08f), corDestaque);

        // Portas com pivô na dobradiça frontal, maçanetas, frisos pretos e panel gaps
        float compPorta = ${(Math.min(1.05, length * 0.24)).toFixed(2)}f;
        float zDobradica = ${(length * 0.12).toFixed(2)}f;
        float compCapo = ${(Math.max(0.55, length * 0.24)).toFixed(2)}f;
        for (int s = -1; s <= 1; s += 2)
        {
            Transform portaPivo = CriarGrupo(grupoPortas, s < 0 ? "Porta_E_Pivo" : "Porta_D_Pivo");
            portaPivo.localPosition = new Vector3(s * ${(width * 0.495 - 0.03).toFixed(3)}f, clear + alturaBase * 0.55f, zDobradica);
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Folha_Porta_E" : "Folha_Porta_D", portaPivo,
                new Vector3(0f, 0f, -compPorta * 0.5f),
                new Vector3(0.055f, alturaBase * 0.78f, compPorta), corPrimaria);
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Macaneta_E" : "Macaneta_D", portaPivo,
                new Vector3(s * 0.034f, alturaBase * 0.26f, -compPorta * 0.76f),
                new Vector3(0.022f, 0.024f, 0.13f), new Color(0.86f, 0.88f, 0.92f));
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Friso_Janela_Porta_E" : "Friso_Janela_Porta_D", portaPivo,
                new Vector3(s * 0.012f, alturaBase * 0.40f, -compPorta * 0.5f),
                new Vector3(0.018f, 0.022f, compPorta * 0.96f), corPretoFosco);
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Retrovisor_E" : "Retrovisor_D", portaPivo,
                new Vector3(s * 0.08f, alturaBase * 0.44f, -0.14f),
                new Vector3(0.14f, 0.08f, 0.10f), corPrimaria);

            // Panel gaps separando portas e capô
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Recorte_Porta_F_E" : "Recorte_Porta_F_D", grupoChassi,
                new Vector3(s * ${(width * 0.498).toFixed(3)}f, clear + alturaBase * 0.55f, zDobradica),
                new Vector3(0.007f, alturaBase * 0.78f, 0.007f), corRecorte);
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Recorte_Porta_T_E" : "Recorte_Porta_T_D", grupoChassi,
                new Vector3(s * ${(width * 0.498).toFixed(3)}f, clear + alturaBase * 0.55f, zDobradica - compPorta),
                new Vector3(0.007f, alturaBase * 0.78f, 0.007f), corRecorte);
            CriarPeca(PrimitiveType.Cube, s < 0 ? "Recorte_Capo_E" : "Recorte_Capo_D", grupoChassi,
                new Vector3(s * ${(width * 0.42).toFixed(3)}f, clear + alturaBase + 0.015f, ${(length * 0.24).toFixed(2)}f + compCapo * 0.5f),
                new Vector3(0.007f, 0.007f, compCapo), corRecorte);
        }

        // Capô com pivô exatamente na dobradiça traseira (junto ao para-brisa)
        Transform capoPivo = CriarGrupo(grupoCapo, "Capo_Pivo");
        capoPivo.localPosition = new Vector3(0f, clear + alturaBase + 0.01f, ${(length * 0.24).toFixed(2)}f);
        CriarPeca(PrimitiveType.Cube, "Capo_Motor", capoPivo,
            new Vector3(0f, 0f, compCapo * 0.5f),
            new Vector3(${(width * 0.84).toFixed(2)}f, 0.06f, compCapo), corPrimaria);`
}

        // 4. Faróis, Faróis de Neblina e Lanternas (grupo separado para emissivo e animação)
        float fX = ${(width * (isPlaneOrJet ? 0.06 : 0.34)).toFixed(2)}f;
        CriarPeca(PrimitiveType.Cube, "Farol_E", grupoLuzes,
            new Vector3(-fX, clear + alturaBase * 0.6f, ${(length * 0.5 + 0.025).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.10f, 0.06f), new Color(1f, 0.97f, 0.82f));
        CriarPeca(PrimitiveType.Cube, "Farol_D", grupoLuzes,
            new Vector3(fX, clear + alturaBase * 0.6f, ${(length * 0.5 + 0.025).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.10f, 0.06f), new Color(1f, 0.97f, 0.82f));
        ${
          !isPlaneOrJet
            ? `CriarPeca(PrimitiveType.Cylinder, "Farol_Neblina_E", grupoLuzes,
            new Vector3(-${(width * 0.36).toFixed(2)}f, clear + 0.088f, ${(length * 0.5 + 0.028).toFixed(2)}f),
            new Vector3(0.055f, 0.022f, 0.055f), new Color(0.95f, 0.98f, 1f)).localRotation = Quaternion.Euler(90f, 0f, 0f);
        CriarPeca(PrimitiveType.Cylinder, "Farol_Neblina_D", grupoLuzes,
            new Vector3(${(width * 0.36).toFixed(2)}f, clear + 0.088f, ${(length * 0.5 + 0.028).toFixed(2)}f),
            new Vector3(0.055f, 0.022f, 0.055f), new Color(0.95f, 0.98f, 1f)).localRotation = Quaternion.Euler(90f, 0f, 0f);`
            : ''
        }
        CriarPeca(PrimitiveType.Cube, "Lanterna_E", grupoLuzes,
            new Vector3(-fX, clear + alturaBase * 0.62f, -${(length * 0.5 + 0.015).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.09f, 0.06f), new Color(0.85f, 0.12f, 0.12f));
        CriarPeca(PrimitiveType.Cube, "Lanterna_D", grupoLuzes,
            new Vector3(fX, clear + alturaBase * 0.62f, -${(length * 0.5 + 0.015).toFixed(2)}f),
            new Vector3(${(width * (isPlaneOrJet ? 0.04 : 0.18)).toFixed(2)}f, 0.09f, 0.06f), new Color(0.85f, 0.12f, 0.12f));
${
  wheelbase > 0 && v.geometry.wheelRadius > 0
    ? `
        // 5. Conjunto de Rodas (Entre-eixos ${wheelbase.toFixed(2)}m · Pivô exato no centro da roda)
        float rRoda = ${v.geometry.wheelRadius.toFixed(2)}f;
        float lRoda = ${v.geometry.wheelWidth.toFixed(2)}f;
        float zEixo = ${(wheelbase * 0.5).toFixed(2)}f;
        ${
          isMoto
            ? `CriarRoda("Roda_Dianteira", grupoRodas, new Vector3(0f, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_Traseira", grupoRodas, new Vector3(0f, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);`
            : `float xRoda = ${(width * (isPlaneOrJet ? 0.14 : 0.46)).toFixed(2)}f;
        CriarRoda("Roda_FE", grupoRodas, new Vector3(-xRoda, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_FD", grupoRodas, new Vector3(xRoda, rRoda, zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_TE", grupoRodas, new Vector3(-xRoda, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);
        CriarRoda("Roda_TD", grupoRodas, new Vector3(xRoda, rRoda, -zEixo), rRoda, lRoda, corPneu, corDestaque);`
        }`
    : `
        // 5. Módulo Propulsão Especial (${v.unitySpec.driveType})
        CriarPeca(PrimitiveType.Cylinder, "Propulsor_Principal", grupoChassi,
            new Vector3(0f, ${(height * 0.65).toFixed(2)}f, -${(length * 0.35).toFixed(2)}f),
            new Vector3(0.45f, 0.30f, 0.45f), corDestaque);`
}

        // 6. Integração com EntrarSairCarro.cs
        EntrarSairCarro entrar = raiz.AddComponent<EntrarSairCarro>();
        entrar.offsetCameraCarro = new Vector3(${camX}f, ${camY}f, ${camZ}f);
        entrar.offsetSaida = new Vector3(-${(width * 0.5 + 1.1).toFixed(2)}f, 0.5f, 0f);

        // 7. Otimização: combina APENAS peças estruturais dentro de Grupo_Chassi (mantendo rodas, portas, capô, faróis, vidros e interior separados)
        CombinarMalhasChassi(grupoChassi.gameObject);

        return raiz;
    }

    private static Transform CriarGrupo(Transform pai, string nome)
    {
        GameObject g = new GameObject(nome);
        g.transform.SetParent(pai, false);
        return g.transform;
    }

    private void CriarRoda(string nome, Transform pai, Vector3 pos, float raio, float largura, Color pneu, Color aro)
    {
        // Pivô exato no centro geométrico da roda (gira livremente sem deformar escala)
        Transform pivoRoda = CriarGrupo(pai, nome + "_Pivo");
        pivoRoda.localPosition = pos;
        float lado = pos.x < 0f ? -1f : 1f;

        Transform r = CriarPeca(PrimitiveType.Cylinder, nome + "_Pneu", pivoRoda, Vector3.zero,
            new Vector3(raio * 2f, largura * 0.42f, raio * 2f), pneu);
        r.localRotation = Quaternion.Euler(0f, 0f, 90f);

        // Disco de freio + pinça atrás dos 5 raios duplos
        Transform disco = CriarPeca(PrimitiveType.Cylinder, nome + "_Disco_Freio", pivoRoda,
            new Vector3(lado * largura * 0.43f, 0f, 0f),
            new Vector3(raio * 1.16f, 0.012f, raio * 1.16f), new Color(0.76f, 0.79f, 0.83f));
        disco.localRotation = Quaternion.Euler(0f, 0f, 90f);
        CriarPeca(PrimitiveType.Cube, nome + "_Pinca_Freio", pivoRoda,
            new Vector3(lado * largura * 0.44f, raio * 0.24f, -raio * 0.32f),
            new Vector3(0.036f, raio * 0.30f, raio * 0.22f), new Color(0.85f, 0.15f, 0.15f));

        Transform cubo = CriarPeca(PrimitiveType.Cylinder, nome + "_Cubo", pivoRoda,
            new Vector3(lado * largura * 0.46f, 0f, 0f),
            new Vector3(raio * 0.34f, 0.020f, raio * 0.34f), aro);
        cubo.localRotation = Quaternion.Euler(0f, 0f, 90f);

        float aroRaio = raio * 0.66f;
        for (int i = 0; i < 5; i++)
        {
            float baseAng = i * 72f;
            for (int pair = -1; pair <= 1; pair += 2)
            {
                float angRad = (baseAng + pair * 11f) * Mathf.Deg2Rad;
                Transform raioMesh = CriarPeca(PrimitiveType.Cube, nome + "_Raio_Duplo_" + i + "_" + (pair < 0 ? "A" : "B"), pivoRoda,
                    new Vector3(lado * largura * 0.47f, Mathf.Cos(angRad) * (aroRaio * 0.56f), Mathf.Sin(angRad) * (aroRaio * 0.56f)),
                    new Vector3(0.022f, aroRaio * 0.84f, 0.024f), aro);
                raioMesh.localRotation = Quaternion.Euler(-(baseAng + pair * 11f), 0f, 0f);
            }
        }
        for (int seg = 0; seg < 10; seg++)
        {
            float segAng = seg * 36f;
            float segRad = segAng * Mathf.Deg2Rad;
            Transform borda = CriarPeca(PrimitiveType.Cube, nome + "_Aro_Borda_" + seg, pivoRoda,
                new Vector3(lado * largura * 0.46f, Mathf.Cos(segRad) * aroRaio, Mathf.Sin(segRad) * aroRaio),
                new Vector3(0.040f, 0.032f, aroRaio * 0.68f), aro);
            borda.localRotation = Quaternion.Euler(-segAng, 0f, 0f);
        }
    }

    private Transform CriarPeca(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 escala, Color cor)
    {
        GameObject go = GameObject.CreatePrimitive(tipo);
        go.name = nome;
        DestroyImmediate(go.GetComponent<Collider>());
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = escala;
        Renderer rend = go.GetComponent<Renderer>();
        rend.sharedMaterial = PegarMaterial(cor, 0.55f);
        if (cor.a < 0.99f || nome.StartsWith("Farol_") || nome.StartsWith("Lanterna_"))
            rend.shadowCastingMode = ShadowCastingMode.Off;
        return go.transform;
    }

    private static void CombinarMalhasChassi(GameObject grupoChassi)
    {
        MeshFilter[] filtros = grupoChassi.GetComponentsInChildren<MeshFilter>(true);
        Dictionary<Material, List<CombineInstance>> grupos = new Dictionary<Material, List<CombineInstance>>();
        List<GameObject> remover = new List<GameObject>();
        Matrix4x4 invChassi = grupoChassi.transform.worldToLocalMatrix;

        for (int i = 0; i < filtros.Length; i++)
        {
            MeshFilter mf = filtros[i];
            if (mf == null || mf.sharedMesh == null) continue;
            Transform t = mf.transform;
            if (t == grupoChassi.transform || t.childCount > 0 || t.GetComponents<Component>().Length > 3) continue;

            MeshRenderer mr = mf.GetComponent<MeshRenderer>();
            if (mr == null || mr.sharedMaterial == null) continue;

            if (!grupos.TryGetValue(mr.sharedMaterial, out List<CombineInstance> lista))
            {
                lista = new List<CombineInstance>();
                grupos[mr.sharedMaterial] = lista;
            }
            lista.Add(new CombineInstance
            {
                mesh = mf.sharedMesh,
                transform = invChassi * t.localToWorldMatrix
            });
            remover.Add(mf.gameObject);
        }

        int lote = 0;
        foreach (var kv in grupos)
        {
            if (kv.Value.Count < 2) continue;
            Mesh combinada = new Mesh { name = grupoChassi.name + "_Lote_" + lote };
            combinada.CombineMeshes(kv.Value.ToArray(), true, true);
            combinada.Optimize();

            GameObject goLote = new GameObject("Chassi_Lote_" + lote++);
            goLote.transform.SetParent(grupoChassi.transform, false);
            goLote.AddComponent<MeshFilter>().sharedMesh = combinada;
            MeshRenderer mrLote = goLote.AddComponent<MeshRenderer>();
            mrLote.sharedMaterial = kv.Key;
            if (kv.Key.renderQueue >= 3000) mrLote.shadowCastingMode = ShadowCastingMode.Off;
        }

        for (int i = 0; i < remover.Count; i++)
        {
            GameObject go = remover[i];
            if (go == null) continue;
            MeshRenderer mr = go.GetComponent<MeshRenderer>();
            if (mr != null && mr.sharedMaterial != null && grupos.TryGetValue(mr.sharedMaterial, out var lst) && lst.Count < 2)
                continue;
            if (Application.isPlaying) Destroy(go);
            else DestroyImmediate(go);
        }
    }

    private static Material PegarMaterial(Color cor, float smoothness)
    {
        Color32 c = cor;
        long qSmooth = Mathf.RoundToInt(Mathf.Clamp01(smoothness) * 20f);
        long chave = ((long)c.r << 32) | ((long)c.g << 24) | ((long)c.b << 16) | ((long)c.a << 8) | qSmooth;
        if (cacheMateriais.TryGetValue(chave, out Material existente) && existente != null)
            return existente;

        if (shaderBase == null) shaderBase = Shader.Find("Universal Render Pipeline/Lit");
        if (shaderBase == null) shaderBase = Shader.Find("Standard");
        Material m = new Material(shaderBase) { enableInstancing = true };
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", cor);
        if (m.HasProperty("_Color")) m.SetColor("_Color", cor);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
        if (cor.a < 0.99f)
        {
            if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
            m.renderQueue = 3000;
        }
        cacheMateriais[chave] = m;
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
