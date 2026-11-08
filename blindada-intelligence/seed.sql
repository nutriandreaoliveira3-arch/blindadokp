-- Dados FICTÍCIOS de demonstração (teste = 1). Nenhuma pessoa real.
INSERT INTO leads (nome, cargo, profissao, empresa, site_empresa, porte, anos_atuacao, cidade, uf, instagram, email, whatsapp, fonte_url, fonte_desc, origem, teste) VALUES
('Helena Exemplo', 'Sócia-fundadora', 'Advogada', 'Exemplo & Associadas', 'exemplo-adv.com.br', '11-50', 18, 'São Paulo', 'SP', '@helena.exemplo', 'helena@exemplo-adv.com.br', '(11) 90000-0001', 'https://exemplo-adv.com.br/equipe', 'Página da equipe com nome e cargo', 'busca', 1),
('Marina Fictícia', 'Fundadora', 'Arquiteta', 'Fictícia Arquitetura', 'ficticia-arq.com.br', '1-10', 12, 'Belo Horizonte', 'MG', '@marina.ficticia', NULL, '(31) 90000-0002', 'https://ficticia-arq.com.br/sobre', 'Página Sobre', 'busca', 1),
('Patrícia Demo', 'Diretora comercial', 'Executiva', 'Demo Imóveis', NULL, '51-200', 9, 'Curitiba', 'PR', NULL, 'patricia@demo-imoveis.com.br', NULL, 'https://demo-imoveis.com.br', 'Site da empresa', 'importacao', 1),
('Renata Teste', 'Proprietária', 'Dentista', 'Clínica Teste Sorriso', 'clinicateste.com.br', '1-10', 15, 'Rio de Janeiro', 'RJ', '@dra.renata.teste', NULL, '(21) 90000-0004', 'https://clinicateste.com.br', 'Site da clínica', 'instagram', 1),
('Camila Amostra', 'Gerente de marketing', NULL, 'Amostra Ltda', NULL, NULL, 4, 'Porto Alegre', 'RS', '@camila.amostra', NULL, NULL, NULL, NULL, 'manual', 1),
('Juliana Modelo', 'CEO', 'Empresária', 'Modelo Viagens', 'modeloviagens.com.br', '11-50', 20, 'Campinas', 'SP', '@ju.modelo', 'juliana@modeloviagens.com.br', '(19) 90000-0006', 'https://modeloviagens.com.br/quem-somos', 'Página Quem somos', 'indicacao', 1);
INSERT INTO sinais (lead_id, tipo) SELECT id, 'segue' FROM leads WHERE nome IN ('Helena Exemplo','Renata Teste','Juliana Modelo');
INSERT INTO sinais (lead_id, tipo) SELECT id, 'interagiu' FROM leads WHERE nome IN ('Renata Teste','Juliana Modelo');
INSERT INTO sinais (lead_id, tipo) SELECT id, 'indicacao' FROM leads WHERE nome = 'Juliana Modelo';
INSERT INTO revisao (tipo, titulo, url, trecho, nome, cargo, empresa, cidade, uf, consulta) VALUES
('pessoa', 'Equipe — Escritório Fictício', 'https://exemplo.invalid/equipe', 'Beatriz Ilustrativa, sócia fundadora, atua há 14 anos em direito empresarial.', 'Beatriz Ilustrativa', 'Sócia fundadora', 'Escritório Fictício', 'Recife', 'PE', 'advogada sócia Brasil'),
('fonte', 'Mulheres são 5% dos CEOs no Brasil (matéria)', 'https://exemplo.invalid/materia', 'Reportagem sobre liderança feminina citando executivas.', NULL, NULL, NULL, NULL, NULL, 'empresária fundadora Brasil');
