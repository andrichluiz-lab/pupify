import { PrismaClient, TemplateType } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDefaultTemplates(tenantId: string) {
  const defaultTemplates = [
    {
      type: 'receita' as TemplateType,
      name: 'Receita Padrão',
      description: 'Template padrão para receitas médicas',
      content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 16px;">
    <div><strong>{{clinica.nome}}</strong></div>
    <div style="color: #0a78ff; font-weight: 600;">CRMV: {{veterinario.crmv}}</div>
  </div>

  <p><strong>DADOS DO ANIMAL:</strong></p>
  <p>
    <strong>Paciente:</strong> {{paciente.nome}}&nbsp;&nbsp;&nbsp;&nbsp;
    <strong>Espécie:</strong> {{paciente.especie}}
  </p>
  <p>
    <strong>Raça:</strong> {{paciente.raca}}&nbsp;&nbsp;&nbsp;&nbsp;
    <strong>Idade:</strong> {{paciente.idade}}&nbsp;&nbsp;&nbsp;&nbsp;
    <strong>Peso:</strong> {{paciente.peso}}&nbsp;&nbsp;&nbsp;&nbsp;
    <strong>Sexo:</strong> {{paciente.sexo}}
  </p>

  <p><strong>DADOS DO PROPRIETÁRIO OU RESPONSÁVEL:</strong></p>
  <p><strong>Nome:</strong> {{tutor.nome}}</p>
  <p><strong>Endereço:</strong> {{tutor.endereco}}</p>
  <p><strong>Telefone:</strong> {{tutor.telefone}}</p>
  <p><strong>E-mail:</strong> {{tutor.email}}</p>

  <hr />

  <p><strong>Prescrição</strong></p>
  <br />

  <p><strong>Data:</strong> {{data}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___________________________________</p>
  <p style="text-align: right;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Assinatura</p>

  <br />
  <p>{{clinica.nome}} - {{clinica.endereco}} | CNPJ: {{clinica.cnpj}}</p>
</div>
      `,
      variables: [
        '{{clinica.nome}}',
        '{{clinica.endereco}}',
        '{{clinica.cnpj}}',
        '{{veterinario.crmv}}',
        '{{paciente.nome}}',
        '{{paciente.especie}}',
        '{{paciente.raca}}',
        '{{paciente.idade}}',
        '{{paciente.peso}}',
        '{{paciente.sexo}}',
        '{{tutor.nome}}',
        '{{tutor.endereco}}',
        '{{tutor.telefone}}',
        '{{tutor.email}}',
        '{{data}}',
      ],
      isActive: true,
    },
    {
      type: 'exame' as TemplateType,
      name: 'Solicitação de Exame Padrão',
      description: 'Template padrão para solicitação de exames',
      content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px; color: #333;">{{clinica.nome}}</h1>
    <p style="margin: 5px 0 0 0; color: #666;">Solicitação de Exames</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; font-size: 14px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">DADOS DO ANIMAL:</h2>
    <p style="margin: 5px 0; font-size: 12px;">
      <strong>Paciente:</strong> {{paciente.nome}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Espécie:</strong> {{paciente.especie}}
    </p>
    <p style="margin: 5px 0; font-size: 12px;">
      <strong>Raça:</strong> {{paciente.raca}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Idade:</strong> {{paciente.idade}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Peso:</strong> {{paciente.peso}} kg&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Sexo:</strong> {{paciente.sexo}}
    </p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; font-size: 14px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">DADOS DO PROPRIETÁRIO:</h2>
    <p style="margin: 5px 0; font-size: 12px;"><strong>Nome:</strong> {{tutor.nome}}</p>
    <p style="margin: 5px 0; font-size: 12px;"><strong>Telefone:</strong> {{tutor.telefone}}</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Exames Solicitados</h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
      <li>Exame 1</li>
      <li>Exame 2</li>
    </ul>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
    <div style="font-size: 12px; color: #666;">
      <p style="margin: 0;"><strong>Data:</strong> {{data}}</p>
    </div>
    <div style="text-align: center;">
      <div style="border-top: 1px solid #333; padding-top: 5px; font-size: 12px; min-width: 200px;">
        Assinatura do Veterinário
      </div>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center;">
    {{clinica.nome}} - {{clinica.endereco}} | CNPJ: {{clinica.cnpj}}
  </div>
</div>
      `,
      variables: [
        '{{clinica.nome}}',
        '{{clinica.endereco}}',
        '{{clinica.cnpj}}',
        '{{paciente.nome}}',
        '{{paciente.especie}}',
        '{{paciente.raca}}',
        '{{paciente.idade}}',
        '{{paciente.peso}}',
        '{{paciente.sexo}}',
        '{{tutor.nome}}',
        '{{tutor.telefone}}',
        '{{data}}',
      ],
      isActive: true,
    },
    {
      type: 'termo' as TemplateType,
      name: 'Termo de Consentimento Padrão',
      description: 'Template padrão para termos de consentimento',
      content: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px; color: #333;">{{clinica.nome}}</h1>
    <p style="margin: 5px 0 0 0; color: #666;">Termo de Consentimento</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; font-size: 14px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">DADOS DO ANIMAL:</h2>
    <p style="margin: 5px 0; font-size: 12px;">
      <strong>Paciente:</strong> {{paciente.nome}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Espécie:</strong> {{paciente.especie}}
    </p>
    <p style="margin: 5px 0; font-size: 12px;">
      <strong>Raça:</strong> {{paciente.raca}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Idade:</strong> {{paciente.idade}}&nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Sexo:</strong> {{paciente.sexo}}
    </p>
  </div>

  <div style="margin-bottom: 20px;">
    <h2 style="margin: 0 0 10px 0; font-size: 14px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">DADOS DO PROPRIETÁRIO:</h2>
    <p style="margin: 5px 0; font-size: 12px;"><strong>Nome:</strong> {{tutor.nome}}</p>
    <p style="margin: 5px 0; font-size: 12px;"><strong>Endereço:</strong> {{tutor.endereco}}</p>
    <p style="margin: 5px 0; font-size: 12px;"><strong>Telefone:</strong> {{tutor.telefone}}</p>
  </div>

  <div style="margin-bottom: 30px; font-size: 12px; line-height: 1.6;">
    <p>Declaro que fui devidamente informado sobre o procedimento a ser realizado no animal acima citado, bem como sobre os riscos e benefícios envolvidos. Autorizo a equipe veterinária da {{clinica.nome}} a realizar o procedimento necessário.</p>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
    <div style="font-size: 12px; color: #666;">
      <p style="margin: 0;"><strong>Data:</strong> {{data}}</p>
    </div>
    <div style="text-align: center;">
      <div style="border-top: 1px solid #333; padding-top: 5px; font-size: 12px; min-width: 200px;">
        Assinatura do Proprietário
      </div>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center;">
    {{clinica.nome}} - {{clinica.endereco}} | CNPJ: {{clinica.cnpj}}
  </div>
</div>
      `,
      variables: [
        '{{clinica.nome}}',
        '{{clinica.endereco}}',
        '{{clinica.cnpj}}',
        '{{paciente.nome}}',
        '{{paciente.especie}}',
        '{{paciente.raca}}',
        '{{paciente.idade}}',
        '{{paciente.sexo}}',
        '{{tutor.nome}}',
        '{{tutor.endereco}}',
        '{{tutor.telefone}}',
        '{{data}}',
      ],
      isActive: true,
    },
  ]

  for (const template of defaultTemplates) {
    await prisma.documentTemplate.create({
      data: {
        type: template.type,
        name: template.name,
        description: template.description,
        content: template.content,
        variables: template.variables,
        isActive: template.isActive,
        tenantId,
      },
    })
  }

  console.log('✅ Default templates seeded successfully')
}
