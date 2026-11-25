using System;
using UnityEngine;

public partial class GeradorCidadeInicial
{
    [NonSerialized] private Texture2D texLoja, texComercialTerreo, texVaranda, texHeliponto, texIpeAmarelo, texIpeRosa;
    [NonSerialized] internal Texture2D[] texOutdoors;
    [NonSerialized] internal Texture2D[] texLetreiros;

    partial void PrepararTexturasEtapa2()
    {
        if (!usarTexturas) return;
        int s = seedAleatoria;

        // Fachada de Loja (vitrine ampla no térreo + porta + placa superior)
        texLoja = NovaTextura("TexFachadaLoja", 128, (x, y) =>
        {
            if (y < 6) return Cor(0.28f, 0.28f, 0.30f);
            if (y >= 92 && y < 120) return Cor(0.18f, 0.20f, 0.24f); // faixa de letreiro
            if (y >= 84 && y < 92) return Cor(0.75f, 0.75f, 0.78f);  // friso/marquise
            if (x >= 12 && x < 116 && y >= 10 && y < 80)
            {
                bool divisoria = x < 16 || x >= 112 || y >= 76 || (x >= 50 && x < 54) || (x >= 80 && x < 84);
                if (divisoria) return Cor(0.22f, 0.24f, 0.26f);
                float brilhoVitrine = 0.72f + (y / 80f) * 0.22f;
                return Cor(0.68f * brilhoVitrine, 0.80f * brilhoVitrine, 0.88f * brilhoVitrine);
            }
            return Cor(0.86f, 0.84f, 0.80f);
        });

        // Comercial com Térreo (pilares e janelas largas)
        texComercialTerreo = NovaTextura("TexComercialTerreo", 128, (x, y) =>
        {
            if (y < 8) return Cor(0.38f, 0.38f, 0.40f);
            if (x < 14 || x >= 114) return Cor(0.76f, 0.74f, 0.70f);
            if (y >= 18 && y < 106)
            {
                bool caixilho = y < 22 || y >= 102 || (x >= 62 && x < 66);
                if (caixilho) return Cor(0.32f, 0.34f, 0.38f);
                float g = 0.75f + 0.25f * (y / 128f);
                return Cor(0.22f * g, 0.34f * g, 0.46f * g);
            }
            return Cor(0.82f, 0.80f, 0.76f);
        });

        // Residencial com Varandas (porta-balcão + parede quente)
        texVaranda = NovaTextura("TexFachadaVaranda", 128, (x, y) =>
        {
            float sujeira = y < 10 ? 0.85f : 1f;
            if (x >= 28 && x < 100 && y >= 14 && y < 106)
            {
                bool moldura = x < 33 || x >= 95 || y < 18 || y >= 101 || (x >= 62 && x < 66);
                if (moldura) return Cor(0.92f, 0.90f, 0.86f);
                return Cor(0.18f, 0.26f, 0.34f);
            }
            float r = 0.92f + (Hash(x, y, s + 61) - 0.5f) * 0.05f;
            return Cor(r * sujeira, r * sujeira, r * sujeira);
        });

        // Heliponto no topo de arranha-céus
        texHeliponto = NovaTextura("TexHeliponto", 128, (x, y) =>
        {
            float dx = (x - 64f) / 56f;
            float dy = (y - 64f) / 56f;
            float dist = Mathf.Sqrt(dx * dx + dy * dy);
            if (dist > 0.92f && dist < 1.0f) return Cor(0.94f, 0.78f, 0.14f);
            if (dist < 0.88f)
            {
                bool hEsq = x >= 40 && x < 48 && y >= 34 && y < 94;
                bool hDir = x >= 80 && x < 88 && y >= 34 && y < 94;
                bool hMeio = x >= 40 && x < 88 && y >= 59 && y < 69;
                if (hEsq || hDir || hMeio) return Cor(0.96f, 0.96f, 0.96f);
            }
            return Cor(0.20f, 0.22f, 0.24f);
        });

        // Folhagem de Ipê Amarelo e Rosa
        texIpeAmarelo = NovaTextura("TexIpeAmarelo", 64, (x, y) =>
        {
            float n = ValueNoise(x, y, 64, 8, s + 71) * 0.65f + Hash(x, y, s + 72) * 0.35f;
            return Cor(0.85f + n * 0.15f, 0.62f + n * 0.28f, 0.06f + n * 0.12f);
        });
        texIpeRosa = NovaTextura("TexIpeRosa", 64, (x, y) =>
        {
            float n = ValueNoise(x, y, 64, 8, s + 73) * 0.65f + Hash(x, y, s + 74) * 0.35f;
            return Cor(0.84f + n * 0.14f, 0.26f + n * 0.26f, 0.56f + n * 0.24f);
        });

        // Outdoors e Letreiros procedurais (tarjas, blocos e ícones estilo Vice City / GTA V)
        texOutdoors = new Texture2D[4];
        Color[] fundoOut = { new Color(0.12f, 0.16f, 0.42f), new Color(0.75f, 0.16f, 0.22f), new Color(0.10f, 0.44f, 0.38f), new Color(0.20f, 0.10f, 0.28f) };
        Color[] destaqueOut = { new Color(0.98f, 0.78f, 0.14f), new Color(0.20f, 0.88f, 0.96f), new Color(0.98f, 0.42f, 0.18f), new Color(0.96f, 0.28f, 0.72f) };

        for (int i = 0; i < 4; i++)
        {
            Color f = fundoOut[i];
            Color d = destaqueOut[i];
            texOutdoors[i] = NovaTextura($"TexOutdoor_{i}", 128, (x, y) =>
            {
                if (x < 4 || x >= 124 || y < 4 || y >= 124) return Cor(0.95f, 0.95f, 0.95f);
                if (y > 88 && y < 112 && x > 12 && x < 116) return Cor(d.r, d.g, d.b);
                if (x > 16 && x < 48 && y > 24 && y < 74) return Cor(1f, 0.96f, 0.88f); // ícone bloco
                if (x > 56 && x < 114 && (y > 54 && y < 68 || y > 30 && y < 44)) return Cor(0.96f, 0.96f, 0.96f); // tarjas de texto
                float grad = 0.85f + (y / 128f) * 0.3f;
                return Cor(f.r * grad, f.g * grad, f.b * grad);
            });
        }

        texLetreiros = new Texture2D[4];
        Color[] coresLet = { new Color(0.95f, 0.22f, 0.32f), new Color(0.12f, 0.72f, 0.88f), new Color(0.96f, 0.64f, 0.10f), new Color(0.24f, 0.78f, 0.36f) };
        for (int i = 0; i < 4; i++)
        {
            Color c = coresLet[i];
            texLetreiros[i] = NovaTextura($"TexLetreiro_{i}", 64, (x, y) =>
            {
                if (x < 3 || x >= 61 || y < 6 || y >= 58) return Cor(0.98f, 0.96f, 0.92f);
                if (x > 8 && x < 20 && y > 16 && y < 48) return Cor(0.98f, 0.92f, 0.22f); // ícone
                if (x > 24 && x < 56 && (y > 34 && y < 46 || y > 18 && y < 28)) return Cor(1f, 1f, 1f); // blocos simulando letras
                return Cor(c.r, c.g, c.b);
            });
        }
    }

    internal Material MatFachada(TipoFachada tipo, int idxPaleta, int idxBrilho)
    {
        float b = NiveisBrilho[Mathf.Clamp(idxBrilho, 0, NiveisBrilho.Length - 1)];
        Color paleta = PaletaPredios[Mathf.Clamp(idxPaleta, 0, PaletaPredios.Length - 1)];
        Color corPaleta = new Color(Mathf.Clamp01(paleta.r * b), Mathf.Clamp01(paleta.g * b), Mathf.Clamp01(paleta.b * b), 1f);
        Color neutra = new Color(Mathf.Clamp01(b), Mathf.Clamp01(b), Mathf.Clamp01(b), 1f);

        Texture2D tex;
        Color tint;
        string nomeTipo = tipo.ToString();

        if (usarTexturas && fachadaPersonalizada != null)
        {
            tex = fachadaPersonalizada;
            tint = neutra;
            nomeTipo = "Custom";
        }
        else
        {
            switch (tipo)
            {
                case TipoFachada.Casa: tex = texCasa; tint = corPaleta; break;
                case TipoFachada.Vidro:
                case TipoFachada.ArranhaCeuEspelhado:
                    tex = texVidro; tint = neutra; break;
                case TipoFachada.Tijolo: tex = texTijolo; tint = neutra; break;
                case TipoFachada.Galpao: tex = texMetal != null ? texMetal : texTijolo; tint = corPaleta; break;
                case TipoFachada.Loja: tex = texLoja != null ? texLoja : texJanelas; tint = neutra; break;
                case TipoFachada.ComercialComTerreo: tex = texComercialTerreo != null ? texComercialTerreo : texJanelas; tint = corPaleta; break;
                case TipoFachada.ResidencialComVarandas: tex = texVaranda != null ? texVaranda : texJanelas; tint = corPaleta; break;
                default: tex = texJanelas; tint = corPaleta; break;
            }
            if (tex == null) tint = corPaleta;
        }

        string chave = $"fachada_{nomeTipo}_{ColorUtility.ToHtmlStringRGB(tint)}";
        float suavidade = (tipo == TipoFachada.Vidro || tipo == TipoFachada.ArranhaCeuEspelhado) ? 0.78f : 0.12f;
        return ObterMaterial(chave, tint, tex, Vector2.one, suavidade, false, false);
    }

    // ============================================================
    // CONSTRUTOR DE EDIFÍCIOS DETALHADOS (CORNIJAS, SACADAS, TELHADOS)
    // ============================================================
    internal void ConstruirEdificioDetalhado(Transform quadraPai, Vector3 posBase, float larg, float prof,
        float altura, int andares, TipoFachada tipo, Distrito dist, int seedLocal)
    {
        int pal = UnityEngine.Random.Range(0, PaletaPredios.Length);
        int bri = UnityEngine.Random.Range(0, NiveisBrilho.Length);
        Material matFachada = MatFachada(tipo, pal, bri);
        Material matConcreto = MatCor(new Color(0.54f, 0.54f, 0.56f), 0.12f);
        Material matEscuro = MatCor(new Color(0.24f, 0.25f, 0.28f), 0.2f);

        GameObject pred = new GameObject($"Edificio_{tipo}_{seedLocal}");
        pred.transform.SetParent(quadraPai, false);
        pred.transform.localPosition = posBase;

        // 1) Corpo principal
        if (tipo == TipoFachada.ComercialComTerreo && andares >= 2)
        {
            float altTerreo = metrosPorAndar * 1.15f;
            float altSup = Mathf.Max(metrosPorAndar, altura - altTerreo);
            CriarCaixa("Terreo_Comercial", pred.transform, new Vector3(0f, altTerreo * 0.5f, 0f),
                new Vector3(larg, altTerreo, prof), MatFachada(TipoFachada.Loja, pal, bri), larg * 0.5f, altTerreo, true, true);
            CriarCaixa("Marquise_Terreo", pred.transform, new Vector3(0f, altTerreo + 0.1f, 0f),
                new Vector3(larg + 0.9f, 0.22f, prof + 0.9f), matEscuro, 1f, 1f, false, false);
            CriarCaixa("Corpo_Superior", pred.transform, new Vector3(0f, altTerreo + altSup * 0.5f, 0f),
                new Vector3(larg * 0.94f, altSup, prof * 0.94f), matFachada, metrosPorAndar, metrosPorAndar, true, true);
            altura = altTerreo + altSup;
        }
        else
        {
            CriarCaixa("Corpo", pred.transform, new Vector3(0f, altura * 0.5f, 0f),
                new Vector3(larg, altura, prof), matFachada, metrosPorAndar, metrosPorAndar, true, true);
        }

        // 2) Casa baixa ganha telhado inclinado simples + beiral
        if (tipo == TipoFachada.Casa)
        {
            Material matTelha = MatCor(new Color(0.68f, 0.30f, 0.20f), 0.1f);
            CriarCaixa("Beiral_Casa", pred.transform, new Vector3(0f, altura + 0.14f, 0f),
                new Vector3(larg + 0.5f, 0.28f, prof + 0.5f), matTelha, 1f, 1f, false, false);
            CriarCaixa("Cumeeira_Casa", pred.transform, new Vector3(0f, altura + 0.52f, 0f),
                new Vector3(larg * 0.78f, 0.48f, prof * 0.78f), matTelha, 1f, 1f, false, false);
            return;
        }

        // 3) Cornija e Marquise de entrada
        if (andares >= 3)
        {
            CriarCaixa("Cornija_Topo", pred.transform, new Vector3(0f, altura - 0.12f, 0f),
                new Vector3(larg + 0.45f, 0.24f, prof + 0.45f), matConcreto, 1f, 1f, false, false);
        }

        if (tipo == TipoFachada.Loja || dist == Distrito.Comercial || dist == Distrito.Centro)
        {
            CriarCaixa("Marquise_Entrada", pred.transform, new Vector3(0f, 3.05f, prof * 0.5f + 0.55f),
                new Vector3(larg * 0.65f, 0.18f, 1.1f), matEscuro, 1f, 1f, false, false);
        }

        // 4) Varandas 3D salientes para ResidencialComVarandas
        if (tipo == TipoFachada.ResidencialComVarandas && presetQualidade != PresetQualidade.Leve)
        {
            int maxAndaresSacada = Mathf.Min(andares - 1, 6);
            Material matGuarda = MatCor(new Color(0.86f, 0.88f, 0.90f), 0.35f);
            for (int a = 1; a <= maxAndaresSacada; a++)
            {
                float ySac = a * metrosPorAndar;
                for (int lado = -1; lado <= 1; lado += 2)
                {
                    CriarCaixa($"Sacada_{a}_{lado}", pred.transform,
                        new Vector3(0f, ySac + 0.1f, lado * (prof * 0.5f + 0.42f)),
                        new Vector3(larg * 0.56f, 0.16f, 0.84f), matConcreto, 1f, 1f, false, false);
                    CriarCaixa($"Guarda_Sacada_{a}_{lado}", pred.transform,
                        new Vector3(0f, ySac + 0.58f, lado * (prof * 0.5f + 0.80f)),
                        new Vector3(larg * 0.56f, 0.80f, 0.08f), matGuarda, 1f, 1f, false, false);
                }
            }
        }

        // 5) Telhados detalhados: Parapeito, Caixa d'água, Ar-condicionado, Antena, Coroa e Heliponto
        CriarParapeitoTelhado(pred.transform, larg, prof, altura, matConcreto);

        if (tipo == TipoFachada.ArranhaCeuEspelhado)
        {
            float altCoroa = 3.2f;
            CriarCaixa("Coroa_ArranhaCeu", pred.transform, new Vector3(0f, altura + altCoroa * 0.5f, 0f),
                new Vector3(larg * 0.68f, altCoroa, prof * 0.68f), matFachada, metrosPorAndar, metrosPorAndar, true, true);
            float yHeli = altura + altCoroa;
            if (texHeliponto != null && larg >= 6f && prof >= 6f)
            {
                Material matHeli = ObterMaterial("heliponto", Color.white, texHeliponto, Vector2.one, 0.15f, false, false);
                CriarCaixa("Heliponto", pred.transform, new Vector3(0f, yHeli + 0.08f, 0f),
                    new Vector3(Mathf.Min(larg * 0.58f, 6.5f), 0.14f, Mathf.Min(prof * 0.58f, 6.5f)), matHeli, 10f, 10f, false, true);
            }
            CriarCilindro("Antena_Torre", pred.transform, new Vector3(larg * 0.22f, yHeli + 3.2f, prof * 0.22f),
                0.18f, 6.4f, matEscuro, false, 6);
            CriarEsfera("Luz_Antena", pred.transform, new Vector3(larg * 0.22f, yHeli + 6.45f, prof * 0.22f),
                0.35f, MatCor(new Color(1f, 0.15f, 0.10f), 0.2f, true), false);
        }
        else
        {
            // Caixa d'água + condensadores de ar-condicionado + antena simples
            CriarCaixa("Caixa_DAgua", pred.transform, new Vector3(-larg * 0.22f, altura + 0.75f, -prof * 0.18f),
                new Vector3(Mathf.Min(2.4f, larg * 0.32f), 1.5f, Mathf.Min(2.4f, prof * 0.32f)), matConcreto, 1f, 1f, false, false);
            CriarCaixa("Unidade_AC", pred.transform, new Vector3(larg * 0.22f, altura + 0.45f, prof * 0.18f),
                new Vector3(1.1f, 0.8f, 0.9f), MatCor(new Color(0.76f, 0.78f, 0.80f), 0.25f), 1f, 1f, false, false);
            if (UnityEngine.Random.value < 0.55f)
                CriarCilindro("Antena_TV", pred.transform, new Vector3(0f, altura + 1.5f, 0f), 0.10f, 3.0f, matEscuro, false, 6);
        }

        // 6) Outdoor ocasional no topo de prédios comerciais/centrais
        if ((dist == Distrito.Comercial || dist == Distrito.Centro) && texOutdoors != null && UnityEngine.Random.value < 0.32f)
        {
            int idxOut = UnityEngine.Random.Range(0, texOutdoors.Length);
            Material matOut = ObterMaterial($"outdoor_{idxOut}", Color.white, texOutdoors[idxOut], Vector2.one, 0.25f, true, false);
            CriarCaixa("Suporte_Outdoor_E", pred.transform, new Vector3(-1.4f, altura + 1.5f, prof * 0.38f), new Vector3(0.18f, 3.0f, 0.18f), matEscuro, 1f, 1f, false, false);
            CriarCaixa("Suporte_Outdoor_D", pred.transform, new Vector3(1.4f, altura + 1.5f, prof * 0.38f), new Vector3(0.18f, 3.0f, 0.18f), matEscuro, 1f, 1f, false, false);
            CriarCaixa("Painel_Outdoor", pred.transform, new Vector3(0f, altura + 2.4f, prof * 0.38f),
                new Vector3(Mathf.Min(larg * 0.85f, 5.4f), 2.4f, 0.22f), matOut, 6f, 3f, false, false);
        }
    }

    private void CriarParapeitoTelhado(Transform pai, float larg, float prof, float altura, Material mat)
    {
        const float hPar = 0.45f;
        const float esp = 0.22f;
        float y = altura + hPar * 0.5f;
        CriarCaixa("Parapeito_N", pai, new Vector3(0f, y, prof * 0.5f - esp * 0.5f), new Vector3(larg, hPar, esp), mat, 1f, 1f, false, false);
        CriarCaixa("Parapeito_S", pai, new Vector3(0f, y, -prof * 0.5f + esp * 0.5f), new Vector3(larg, hPar, esp), mat, 1f, 1f, false, false);
        CriarCaixa("Parapeito_L", pai, new Vector3(larg * 0.5f - esp * 0.5f, y, 0f), new Vector3(esp, hPar, prof), mat, 1f, 1f, false, false);
        CriarCaixa("Parapeito_O", pai, new Vector3(-larg * 0.5f + esp * 0.5f, y, 0f), new Vector3(esp, hPar, prof), mat, 1f, 1f, false, false);
    }

    // ============================================================
    // ÁRVORES VARIADAS (COPA ESFÉRICA, PALMEIRA E IPÊ AMARELO/ROSA)
    // ============================================================
    internal void CriarArvoreVariada(Transform pai, Vector3 basePos, int indice, bool ehPraca)
    {
        float r = UnityEngine.Random.value;
        if (r < 0.22f)
        {
            CriarPalmeira(pai, basePos);
            return;
        }

        GameObject arvore = new GameObject($"Arvore_Var_{indice}");
        arvore.transform.SetParent(pai, false);
        arvore.transform.localPosition = basePos;

        float alturaTronco = UnityEngine.Random.Range(1.8f, 2.7f);
        CriarCilindro("Tronco", arvore.transform, new Vector3(0f, alturaTronco * 0.5f, 0f),
            0.34f, alturaTronco, MatTronco(), true, 8);

        Material matCopa = MatCopa();
        if (r < 0.48f && texIpeAmarelo != null && texIpeRosa != null)
        {
            bool amarelo = (indice % 2 == 0);
            Texture2D texIpe = amarelo ? texIpeAmarelo : texIpeRosa;
            matCopa = ObterMaterial(amarelo ? "copa_ipe_amarelo" : "copa_ipe_rosa", Color.white, texIpe, Vector2.one, 0.05f, false, false);
        }

        float diam = ehPraca ? UnityEngine.Random.Range(2.1f, 2.8f) : UnityEngine.Random.Range(1.7f, 2.2f);
        CriarEsfera("Copa", arvore.transform, new Vector3(0f, alturaTronco + diam * 0.42f, 0f), diam, matCopa, false);
    }
}