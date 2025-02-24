import { mjml, type MJMLValue } from '../mjml';

export { mjml };

export function paragraph(content: string) {
  return mjml`
    <mj-text padding-bottom="10px" line-height="1.6" font-size="16px">
      ${content}
    </mj-text>
  `;
}

export function button(input: { url: string; text: string }) {
  return mjml`
    <mj-button align="left" href="${input.url}" font-size="16px" border-radius="3px" color="#fff" background-color="#245850">
      ${input.text}
    </mj-button>
  `;
}

export function email(input: { title: string; body: MJMLValue }) {
  return mjml`
    <mjml>
      <mj-body>
        <mj-section background-color="#e6eded">
          <mj-column>
            <mj-text color="#245850" font-size="28px" font-weight="300">
              Hive
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-section>
          <mj-column>
            <mj-text color="#245850" font-size="24px" font-weight="300" padding-bottom="20px">
              ${input.title}
            </mj-text>
            ${mjml(input.body)}
          </mj-column>
        </mj-section>
        <mj-section>
          <mj-column>
            <mj-divider border-width="1px" border-color="#eeeeee"></mj-divider>
            <mj-text align="center" padding-bottom="20px" line-height="1.6" font-size="14px" color="#888888">
    © ${mjml.raw(String(new Date().getFullYear()))} Hive. All rights reserved.
              </mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `.content;
}
