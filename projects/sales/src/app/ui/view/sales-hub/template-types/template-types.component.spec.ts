import { TemplateTypesComponent, QUOTE_TEMPLATES, deliveryNoteShowsField } from './template-types.component';

describe('TemplateTypesComponent', () => {
  let component: TemplateTypesComponent;

  beforeEach(() => {
    component = new TemplateTypesComponent({ add: jasmine.createSpy('add') } as any);
  });

  it('pre-selects the first template when none is passed in', () => {
    component.ngOnInit();
    expect(component.selectedTemplateId).toBe(QUOTE_TEMPLATES[0].id);
  });

  it('keeps a template passed in by the parent instead of resetting to the first one', () => {
    component.selectedTemplateId = 'emirates';
    component.ngOnInit();
    expect(component.selectedTemplate?.id).toBe('emirates');
  });

  describe('for quotes', () => {
    it('offers every template with its shared description', () => {
      expect(component.visibleTemplates.length).toBe(QUOTE_TEMPLATES.length);
      const standard = QUOTE_TEMPLATES[0];
      expect(component.getTemplateDescription(standard)).toBe(standard.description);
    });
  });

  describe('for delivery notes', () => {
    beforeEach(() => component.documentType = 'delivery-note');

    it('hides the customer-bank variant, which has nothing to show on a delivery note', () => {
      expect(component.visibleTemplates.map(t => t.id)).not.toContain('emirates-custbank');
    });

    it('falls back to the first template if a hidden one was passed in', () => {
      component.selectedTemplateId = 'emirates-custbank';
      component.ngOnInit();
      expect(component.selectedTemplate?.id).toBe('standard');
    });

    it('only tags what differs between delivery note templates', () => {
      const tags = (id: string) => component.getTemplateTags(QUOTE_TEMPLATES.find(t => t.id === id)!);
      expect(tags('standard')).toEqual(['Logo', 'Full Recipient Details']);
      expect(tags('minimal')).toEqual(['LPO No.']);
      expect(tags('compact')).toEqual(['LPO No.', 'Telephone']);
      expect(QUOTE_TEMPLATES.map(t => tags(t.id).join()).join()).not.toContain('Invoice');
      expect(tags('standard')).not.toContain('Tax Breakdown');
    });

    it('uses delivery-note wording in descriptions', () => {
      component.visibleTemplates.forEach(t => {
        expect(component.getTemplateDescription(t)).not.toMatch(/quote|invoices|total/i);
      });
    });
  });

  describe('deliveryNoteShowsField', () => {
    it('shows every optional field when no template is applied', () => {
      expect(deliveryNoteShowsField(null, 'attention')).toBeTrue();
      expect(deliveryNoteShowsField(undefined, 'telephone')).toBeTrue();
    });

    it('follows the template\'s field list', () => {
      expect(deliveryNoteShowsField('minimal', 'lpoNumber')).toBeTrue();
      expect(deliveryNoteShowsField('minimal', 'attention')).toBeFalse();
    });
  });
});
