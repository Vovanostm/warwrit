import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OrdinaryContractDto } from '@warwrit/protocol';
import { ContractConversation } from './ContractBoard.js';
import type { ContractVisit } from './contract-visits.js';

const issuerLocation = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
const herbs: OrdinaryContractDto = {
  instanceId: 'ci.m1.missing-herbs.01',
  template: 'INVESTIGATE',
  issuerRoleId: 'village-provisioner',
  issuerLocation,
  rewardQ: '40000000',
  revision: '1',
  yourRole: 'OWNER',
  helperSlot: 'AVAILABLE',
  state: 'ACTIVE',
  completedByYou: false,
  canAccept: false,
  canHelp: false,
  yourCustody: [],
  steps: [
    {
      stepId: 'inspect-green',
      action: 'INSPECT',
      location: issuerLocation,
      doneByYou: false,
      blocker: null,
      completes: false,
    },
    {
      stepId: 'report',
      action: 'REPORT',
      location: issuerLocation,
      doneByYou: false,
      blocker: 'MISSING_EVIDENCE',
      completes: true,
    },
  ],
};

function render(
  contract: OrdinaryContractDto,
  visit: ContractVisit | null,
  currentSiteId = 'bereznyak',
) {
  return renderToStaticMarkup(
    <ContractConversation
      contract={contract}
      currentSiteId={currentSiteId}
      visit={visit}
      canVisit
      busy={false}
      onCommand={() => undefined}
      onVisitIssuer={() => undefined}
      onJournal={() => undefined}
    />,
  );
}

describe('contract conversation and journal boundaries', () => {
  it('shows a local lead outside a conversation and fixed terms only at its issuer', () => {
    const offered = {
      ...herbs,
      yourRole: 'NONE' as const,
      state: 'OFFERED' as const,
      canAccept: true,
    };
    const lead = render(offered, null);
    expect(lead).toContain('Поговорить');
    expect(lead).not.toContain('Договориться и взять поручение');
    expect(render(offered, { siteId: 'bereznyak', building: 'forge' })).not.toContain(
      'Договориться и взять поручение',
    );
    const meeting = render(offered, { siteId: 'bereznyak', building: 'herbalist' });
    expect(meeting).toContain('Договориться и взять поручение');
    expect(meeting).toContain('40 кр.');
    expect(meeting).toContain('лично доложите заказчику');
  });

  it('does not invite an early hand-in, then routes an evidenced report to its issuer', () => {
    const journal = render(herbs, null);
    expect(journal).toContain('сначала предыдущие шаги');
    expect(journal).not.toContain('Встретиться');
    const ready: OrdinaryContractDto = { ...herbs, steps: [{ ...herbs.steps[1]!, blocker: null }] };
    expect(render(ready, null)).toContain('Встретиться');
    expect(render(ready, null)).not.toContain('Передать результат заказчику');
    expect(render(ready, null, 'severny-dvor')).not.toContain('Встретиться');
    expect(render(ready, { siteId: 'bereznyak', building: 'herbalist' })).toContain(
      'Передать результат заказчику',
    );
  });

  it('keeps green inspection out of village mills and issuer meetings, while allowing real mill field work', () => {
    expect(render(herbs, null)).toContain('class="gear-action"');
    for (const building of ['mill', 'herbalist'] as const) {
      const inside = render(herbs, { siteId: 'bereznyak', building });
      expect(inside).not.toContain('class="gear-action"');
      expect(inside).toContain('Выйти на площадь и продолжить');
    }
    const millPlace = { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' };
    const rescue: OrdinaryContractDto = {
      ...herbs,
      instanceId: 'ci.m1.mill-worker.01',
      template: 'RESCUE',
      steps: [
        {
          stepId: 'release',
          action: 'RELEASE',
          location: millPlace,
          doneByYou: false,
          blocker: null,
          completes: false,
        },
      ],
      yourCustody: ['person.mill-worker.01'],
    };
    expect(render(rescue, { siteId: 'staraya-melnitsa', building: 'mill' })).toContain(
      'class="gear-action"',
    );
  });
});
