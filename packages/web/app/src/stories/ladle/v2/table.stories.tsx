import type { Story } from '@ladle/react';
import { Table, TBody, THead, TFoot, Th, Td, Tr } from '@/components/v2/table';

export default {
  title: 'V2 / Table',
};

export const Simple: Story = () => (
  <Table>
    <THead>
      <Th>Name</Th>
      <Th>Email</Th>
      <Th>Role</Th>
    </THead>
    <TBody>
      <Tr>
        <Td>John Doe</Td>
        <Td>john@example.com</Td>
        <Td>Admin</Td>
      </Tr>
      <Tr>
        <Td>Jane Smith</Td>
        <Td>jane@example.com</Td>
        <Td>User</Td>
      </Tr>
    </TBody>
  </Table>
);

export const WithFooter: Story = () => (
  <Table>
    <THead>
      <Th>Product</Th>
      <Th align="right">Price</Th>
      <Th align="right">Quantity</Th>
    </THead>
    <TBody>
      <Tr>
        <Td>Widget A</Td>
        <Td className="text-right">$10.00</Td>
        <Td className="text-right">5</Td>
      </Tr>
      <Tr>
        <Td>Widget B</Td>
        <Td className="text-right">$25.00</Td>
        <Td className="text-right">2</Td>
      </Tr>
    </TBody>
    <TFoot>
      <Th>Total</Th>
      <Th className="text-right">$60.00</Th>
      <Th className="text-right">7</Th>
    </TFoot>
  </Table>
);

export const ManyRows: Story = () => (
  <Table>
    <THead>
      <Th>ID</Th>
      <Th>Schema</Th>
      <Th>Version</Th>
      <Th>Status</Th>
    </THead>
    <TBody>
      {Array.from({ length: 10 }, (_, i) => (
        <Tr key={i}>
          <Td>{i + 1}</Td>
          <Td>schema-{i + 1}</Td>
          <Td>v1.{i}.0</Td>
          <Td>{i % 2 === 0 ? 'Active' : 'Deprecated'}</Td>
        </Tr>
      ))}
    </TBody>
  </Table>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Table Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Composed table component with semantic HTML table elements. Includes THead, TBody, TFoot,
        Th, Tr, and Td subcomponents with default styling.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-gray-600/10 h-6 w-16 rounded-sm" />
          <code className="text-xs">odd:bg-gray-600/10</code>
          <span className="text-neutral-11 text-xs">- Odd rows (zebra striping)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="border-gray-600/10 h-6 w-16 rounded-sm border" />
          <code className="text-xs">border-gray-600/10</code>
          <span className="text-neutral-11 text-xs">- Row borders</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 text-xs">Footer text</span>
          <code className="text-xs">text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- TFoot text color</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs">Row text</span>
          <code className="text-xs">text-xs</code>
          <span className="text-neutral-11 text-xs">- Tr text size (inherits color)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">Cell text</span>
          <code className="text-xs">text-sm</code>
          <span className="text-neutral-11 text-xs">- Td text size (inherits color)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">w-full overflow-hidden</code>
          <span className="text-neutral-11 text-xs">- Table root</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-5 py-4</code>
          <span className="text-neutral-11 text-xs">- Th padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-4 py-2</code>
          <span className="text-neutral-11 text-xs">- Td padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">break-all</code>
          <span className="text-neutral-11 text-xs">- Td word breaking</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Pattern</h4>
      <div className="space-y-2">
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`<Table>
  <THead>
    <Th>Header</Th>
  </THead>
  <TBody>
    <Tr>
      <Td>Data</Td>
    </Tr>
  </TBody>
  <TFoot>
    <Th>Footer</Th>
  </TFoot>
</Table>`}
        </pre>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Th Alignment</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            Th accepts align prop (defaults to "left"):
          </p>
          <Table className="w-auto">
            <THead>
              <Th>Left (default)</Th>
              <Th align="center">Center</Th>
              <Th align="right">Right</Th>
            </THead>
          </Table>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Example</h4>
      <div>
        <Table>
          <THead>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th align="right">Count</Th>
          </THead>
          <TBody>
            <Tr>
              <Td>Project A</Td>
              <Td>Active</Td>
              <Td className="text-right">42</Td>
            </Tr>
            <Tr>
              <Td>Project B</Td>
              <Td>Inactive</Td>
              <Td className="text-right">17</Td>
            </Tr>
          </TBody>
        </Table>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>All components accept ComponentProps for their respective HTML elements</li>
        <li>THead automatically wraps children in a tr element</li>
        <li>TFoot automatically wraps children in a tr with text-neutral-10 class</li>
        <li>Tr provides zebra striping via odd:bg-gray-600/10</li>
        <li>All components support className for customization via cn() utility</li>
        <li>Th supports align prop for text alignment</li>
        <li>Commented code hints at future column.align and column.width features</li>
      </ul>
    </div>
  </div>
);
