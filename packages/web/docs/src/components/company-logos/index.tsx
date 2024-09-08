export type LogoProps = {
  height: number;
  className?: string;
  title?: string;
};

export function MeetupLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 111 40" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M110.994 23.367a1.687 1.687 0 00-.11-.458c-.37-.962-2.054-.065-2.629.176-1.035.434-2.219 1.006-3.365.678-.317-.091-.224-.361 0-.499.112-.068 3.055-1.733 3.921-5.423 1.386-5.903-2.867-7.545-4.545-7.744-1.706-.202-3.609.061-4.411.384-2.273.913-2.866 2.943-3.023 4.159-.215 1.672-.24 4.59-.447 5.903-.136.865-.78 2.178-2.048 2.053-2.447-.241-3.571-1.18-3.493-2.722.054-1.084.039-1.3.38-3.704.293-2.06.478-2.551.478-3.022 0-1.349-1.813-1.621-2.419-1.014-.468.469-.585 1.426-.702 3.042-.11 1.519-.343 3.495-.644 4.7-.468 1.877-.656 2.014-1.083 2.551-.887 1.116-2.526.77-3.326.009-.47-.448-.534-.845-.443-2.16.091-1.315.306-3.606.608-5.995.263-2.09.082-2.404-.56-2.99-.597-.546-2.884-.465-3.943-.465-1.639 0-1.541.78-1.649 3.44-.047 1.161-.101 2.923-.217 4.287-.188 2.22-4.425 3.89-6.373 3.79-2.019-.104-2.213-3.873-2.34-4.75-.129-.876-.18-8.44.038-8.697.155-.18 1.37-.318 2.755-.589 3.067-.6 3.508-.994 3.512-1.954.002-.471-.028-1.13-.55-1.307-.306-.104-1.1-.222-2.153-.346-3.037-.358-3.465-.248-3.482-.633-.029-.674.035-1.971-.019-2.482C68.58.329 67.108-.093 65.45.017c-.327.021-.78.127-.816.565-.036.439-.033.777-.086 1.52-.117 1.651-.15 1.83-.79 1.827-.57-.003-5.312-.422-6.223-.13-.912.292-.875.913-.948 1.224-.073.31.09 2.173.182 2.977.091.803.267 1.896.376 2.06.11.165.452.631 1.404.512 3.234-.405 5.391-.894 5.829-1.003.437-.11.487-.165.492.182.002.197.084 4.146.098 5.319.023 2.006.362 7.817-5.044 8.718-2.249.375-4.357-.28-5.316-1.337-.544-.6-.277-.678-.037-1.068.364-.593 3.402-4.162.856-7.864-1.501-2.184-5.101-2.357-6.408-1.79-1.013.439-1.832 1.8-1.99 3.46-.488 5.12 2.442 8.287 2.556 8.482.136.234-.376.988-2.166 1.25-2.4.352-6.085-2.543-5.99-2.92.047-.18 1.679-2.853 1.718-5.436.013-.879-.277-2.036-.878-3.205-.602-1.169-2.496-2.973-4.546-2.577-4.824.93-4.274 5.696-3.94 6.997.694 2.69 2.319 5.064 2.584 5.539.361.645-10.207 4.839-10.616.913-.407-3.892 5.371-12.284 4.916-15.54-.41-2.933-2.382-3.547-4.097-3.577-1.667-.03-2.107.236-2.671.564-.325.189-.792.563-1.44-.055-.431-.411-.716-.699-1.172-1.064-.231-.185-.601-.42-1.221-.511-.62-.091-1.422 0-1.932.219-.51.22-.912.603-1.331.968-.42.365-1.483 1.559-2.474 1.119-.43-.191-1.887-.92-2.937-1.375-2.029-.88-4.955.545-6.008 2.421C3.815 10.193.72 21.161.252 22.607c-1.052 3.248 1.33 5.896 4.545 5.744 1.358-.065 2.263-.562 3.121-2.126.496-.903 5.156-13.097 5.502-13.681.252-.425 1.09-.984 1.8-.62.712.366.853 1.128.748 1.845-.17 1.16-3.456 8.6-3.582 9.441-.215 1.432.464 2.228 1.947 2.306 1.016.053 2.029-.313 2.833-1.832.45-.849 5.631-11.248 6.09-11.942.504-.762.91-1.013 1.422-.986.399.02 1.036.123.876 1.319-.156 1.172-4.322 8.803-4.76 10.671-.663 2.834 1.151 6.646 6.01 6.821 2.414.088 8.002-.966 11.15-3.357 1.143-.868.841-.943 1.553-.311 1.025.909 2.927 2.189 4.8 2.189 4.253 0 7.359-2.66 7.5-2.756a.111.111 0 01.145.017c.258.28 2.895 1.751 4.743 1.812 4.399.145 7.004-2.3 7.988-3.451a22.03 22.03 0 001.512-1.987.157.157 0 01.246-.018c.263.29 2.247 3.942 6.188 3.438 2.198-.281 5.467-2.139 5.696-2.39a.1.1 0 01.17.035c.115.318.618 2.11 2.633 3.535 1.652 1.169 4.832 1.403 6.243.626 1.17-.644 1.639-1.056 2.458-1.876.352-.353.888-.71 1.854-.505 1.08.229 3.934.735 4.116.822.205.097.237.47.176.86-.098.614-.33 2.766-.566 4.775-.237 2.009-.994 8.712.8 8.96 1.084.15 2.025-.878 2.274-1.881.624-2.517.738-5.35 1.148-7.78.49-2.893.684-3.704.86-4.027.146-.268.146-.205 2.167-.033 1.4.12 2.536.315 4.223.079 1.398-.196 4.267-1.256 4.113-2.976m-69.897-6.502c-.067.947-.31 1.547-.811 2.419-.313.544-.637.137-.825-.132-.27-.386-1.65-3.744-.596-4.437.297-.195.886-.307 1.312-.068.426.238.683.585.8.972.12.393.164.613.12 1.246m13.092.488c-.123 1.09-.585 1.707-.755 1.936-.301.404-.422.563-.71.27-.234-.238-1.109-2.02-1.235-3.195-.069-.632.106-1.535.636-1.747.558-.223 1.123-.122 1.52.397.623.817.632 1.564.544 2.339M101.7 22.13c-.657.27-.943.105-.905-.982.008-.234 1.063-5.687 3.08-6.675.572-.28 1.152-.268 1.554.18.76.847.56 2.152-.012 3.342-.828 1.727-2.814 3.764-3.717 4.135"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function LinktreeLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 504 104" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M0 11.9644H14.4539V88.0878H54.5162V101.48H0V11.9644ZM68.813 11.9644C73.7618 11.9644 77.8466 15.8019 77.8466 20.7358C77.8466 25.748 73.7618 29.7422 68.813 29.7422C63.7855 29.7422 59.7793 25.748 59.7793 20.7358C59.7793 15.8019 63.7855 11.9644 68.813 11.9644ZM61.7431 36.9472H75.6471V101.48H61.7431V36.9472ZM83.8167 36.9472H97.7207V45.8753C101.805 39.0618 108.875 35.2243 118.223 35.2243C133.305 35.2243 142.732 46.9717 142.732 65.611V101.48H128.828V66.8641C128.828 54.8034 123.565 47.9899 113.981 47.9899C103.534 47.9899 97.7207 55.1166 97.7207 68.0388V101.48H83.8167V36.9472ZM150.037 11.9644H163.941V68.587L189.864 37.0256H207.303L179.652 69.2919L207.303 101.48H189.864L163.941 69.9967V101.48H150.037V11.9644ZM212.723 20.5008H226.863V36.9472H243.359V48.4597H226.863V81.6659C226.863 85.8949 229.455 88.4794 233.461 88.4794H242.731V101.48H231.576C219.479 101.48 212.723 94.3531 212.723 81.6659V20.5008ZM250.5 36.9472H263.39V44.9355C266.847 38.8268 272.581 35.2243 279.651 35.2243C281.772 35.2243 282.95 35.3026 284.521 35.8508V48.773C283.579 48.5381 282.165 48.3031 279.337 48.3031C269.125 48.3031 263.469 56.8396 263.469 71.6414V101.48H249.565V36.9472H250.5ZM316.964 35.2243C332.282 35.2243 348.857 44.4656 348.857 70.7016V72.5812H299.054C300.153 84.0936 306.83 90.4373 317.985 90.4373C325.997 90.4373 332.832 86.1299 334.324 80.0995H348.464C347.05 93.0217 333.617 103.203 317.985 103.203C297.954 103.203 285.385 90.2023 285.385 69.1353C285.385 50.496 297.561 35.2243 316.964 35.2243ZM334.089 61.0687C332.125 53.0804 325.84 48.0682 317.042 48.0682C308.559 48.0682 302.589 53.2371 300.232 61.0687H334.089ZM386.641 35.2243C401.959 35.2243 418.534 44.4656 418.534 70.7016V72.5812H368.731C369.83 84.0936 376.507 90.4373 387.662 90.4373C395.675 90.4373 402.509 86.1299 404.001 80.0995H418.141C416.727 93.0217 403.294 103.203 387.662 103.203C367.631 103.203 355.062 90.2023 355.062 69.1353C355.062 50.496 367.16 35.2243 386.641 35.2243ZM403.687 61.0687C401.723 53.0804 395.439 48.0682 386.562 48.0682C378.079 48.0682 372.108 53.2371 369.752 61.0687H403.687Z"
        fill="currentColor"
      />
      <path
        d="M446.813 34.9893H421.99H421.833V48.8512H446.813L429.06 66.0808L438.801 75.7921L462.917 51.5923L487.033 75.7921L496.773 66.0808L479.02 48.8512H504V34.9893H479.177L496.852 18.2296L487.111 8.28341L470.301 25.513V1H455.69V25.513L438.879 8.28341L429.138 18.2296L446.813 34.9893Z"
        fill="currentColor"
      />
      <path d="M470.379 68.6653H455.768V101.558H470.379V68.6653Z" fill="currentColor" />
    </svg>
  );
}

export function AligentLogo(props: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 474.69 121.34" {...props}>
      <g>
        <path
          fill="currentColor"
          d="m469.15,43.72c-10.28,7.17-21.82,13.88-34.26,16.37-1.89.38-3.8.76-5.74.8-.69.02-2.1.17-2.72-.2-.51-.31-.86-.92.03-1.27.28-.11.56-.26.88-.4,11.5-5.1,48.07-19.89,47.33-58.41-.02-.79-.31-.81-.95-.08-23.23,26.58-49.14,46.99-75.49,52.34-.45.09-.57.45-.63.8-2.45,13.52-14.25,23.37-28.15,23.75-5.04.14-10.03-1.16-14.17-3.45-.83-.27-1.08.4-1.06,1.36.34,16.95,9.6,46.01,35.28,46.01.29,0,.61.02.51-.34-.07-.26-.56-.61-.77-.77-15.48-12.3-16.35-18.52-16.28-18.71.09-.23.46-.18.69-.09.97.38,13.67,17.24,42.73,13.64,2.55-.32,4.21-1.01,6.66-1.77.48-.15.87-.56.07-.7-24.08-4.31-30.22-11.65-31.85-13.09-.54-.48-.36-1.37,1.13-.89.76.26,32.64,14.16,53.8-3.07.35-.28.59-.78.07-.75-22.99,1.4-33.2-2.43-38.47-5-.86-.42-.53-1.65,1.26-1.25,20.8,4.69,43.45-3.79,50.4-13.23.24-.32.24-.67-.46-.52-27.11,5.69-37.74,2.2-40.04,1.45-1.46-.47-.89-1.54.09-1.57,1.87-.05,41.88,3,50.92-30.46.17-.62.08-1.13-.81-.51Z"
        />
        <path
          fill="currentColor"
          d="m424.13,23.19c-.35-.51-.87-.91-1.6-1.14-.3-.09-.62-.12-.93-.04-.76.19-1.26.89-1.7,1.54-1.54,2.24-3.18,4.42-4.92,6.5-1.91,2.28-3.96,4.44-6.15,6.46-2.13,1.97-4.44,3.71-6.85,5.31-1.13.75-2.27,1.47-3.36,2.26-.32.23-.7.52-.62.98.05.28.32.47.59.54.22.06.46.05.69.03,1.35-.11,2.65-.51,3.93-.93,2.74-.92,5.35-2.24,7.75-3.85,2.39-1.6,4.61-3.44,6.66-5.45,1.47-1.45,2.93-2.93,4.22-4.54,1.08-1.34,2.23-2.78,2.66-4.48.3-1.16.22-2.33-.36-3.19Z"
        />
        <path
          fill="currentColor"
          d="m404.88,13.02c-.94,2.27-1.82,4.56-2.72,6.84-.84,2.14-1.78,4.24-2.84,6.28s-2.39,4.12-3.62,6.15c-.32.53-.64,1.06-.84,1.65-.16.49-.11,1.08.48,1.17,1.31.2,2.92-1.38,3.8-2.18,3.11-2.84,5.89-6.07,7.82-9.84.71-1.38,1.31-2.81,1.92-4.24.59-1.39,1.21-2.88,1.03-4.43-.14-1.22-.81-2.37-1.98-2.84-1.27-.51-2.55.29-3.03,1.44Z"
        />
        <path
          fill="currentColor"
          d="m394.8,9.59c-.21-1-.74-1.97-1.61-2.52-.86-.55-2.08-.59-2.87.06-.93.76-1.02,2.11-1.07,3.31-.18,4.88-.73,9.74-1.6,14.55-.05.27-.1.56.01.82.38.9,1.5-.52,1.78-.85,1.21-1.43,2.25-3.01,3.07-4.7,1.16-2.39,1.92-4.98,2.28-7.61.14-1.01.22-2.05,0-3.06Z"
        />
        <path
          fill="currentColor"
          d="m379.39,20.35c1.56-3.07,2.01-6.72,1.24-10.07-.18-.78-.43-1.56-.85-2.25s-1.02-1.28-1.77-1.58c-.79-.32-1.81-.23-2.33.44-.32.42-.39.97-.4,1.49-.01,1.03.16,2.05.38,3.05.32,1.49.73,2.96,1.16,4.43.41,1.4.84,2.81,1.43,4.14.08.19.17.38.32.52.3.28.63.18.8-.17"
        />
        <path
          fill="currentColor"
          d="m365.04,9.91c-.74-.37-1.96-.63-2.69-.1-1.1.8-.43,2.66.04,3.62.53,1.08,1.19,2.09,1.92,3.05.37.49.77.96,1.17,1.42.33.38.7.94,1.15,1.17.95.49.74-1.81.74-2.23,0-1.19-.09-2.38-.32-3.55-.25-1.31-.78-2.7-2.01-3.38"
        />
        <path
          fill="currentColor"
          d="m355.8,20.47c.21.48.63,1.72-.21,1.86-.45.08-.86-.21-1.24-.41-.47-.25-.93-.52-1.38-.82-.87-.58-1.69-1.24-2.43-1.98-.46-.47-.92-1.03-.93-1.68-.02-.67.47-1.3,1.09-1.53.85-.32,1.83.01,2.55.57,1.29,1,1.91,2.56,2.55,4"
        />
        <path
          fill="currentColor"
          d="m346.38,28.15c-.67-.79-1.63-1.27-2.55-1.72-1.1-.54-2.35-1.01-3.59-.71-.88.22-1.68.82-2.03,1.66-.22.51-.24,1.16.13,1.58.18.21.44.34.7.44,1.1.42,2.33.35,3.48.41,1.29.06,2.7.22,3.93-.28.56-.23.42-.72.12-1.14-.06-.08-.12-.16-.18-.24Z"
        />
        <path
          fill="currentColor"
          d="m340.58,39.33c-.86-.83-2.04-1.29-3.22-1.44s-2.31-.03-3.43.25c-1.11.28-2.21.72-3.07,1.49-.85.77-1.52,2.03-1.27,3.21.03.14.08.28.16.4.26.36.73.25,1.09.13,1.49-.49,2.89-1.18,4.38-1.67.87-.29,1.76-.53,2.65-.74s1.75-.26,2.58-.5c.7-.2.59-.69.12-1.12"
        />
        <path
          fill="currentColor"
          d="m339.68,49.94c-.07-.1-.18-.19-.32-.24-.17-.06-.36-.05-.54-.04-1,.09-1.88.48-2.8.86-.98.4-1.93.85-2.86,1.35-1.36.73-2.67,1.58-3.87,2.56-.98.8-2.05,2.23-2.75,3.29-.73,1.1-1.16,2.38-1.26,3.69-.06.78-.19,2.86,1.16,2.57.34-.07.63-.3.9-.52,1.78-1.47,3.11-3.51,4.68-5.2,1.59-1.71,3.16-3.52,4.99-4.98.48-.38,2.48-2,2.71-2.61.09-.26.1-.53-.04-.73Z"
        />
        <path
          fill="currentColor"
          d="m339.35,61.51c-1.75,1.93-2.57,2.78-3.95,4.97-2.77,4.43-6.51,11.12-6.13,16.6.04.75.15,1.49.32,2.21.2.83.48,1.64.85,2.41s.89,1.76,1.75,2.08c.17.07.38.08.54,0,.56-.28.77-1.4.87-1.95,1.07-5.92,2.47-11.82,4.58-17.46.82-2.18,1.72-4.32,2.77-6.4.47-.93.96-1.85,1.3-2.83.08-.22.14-.45.13-.69s-.13-.47-.35-.57c-.25-.12-.54-.02-.78.1-.76.36-1.34.94-1.9,1.55Z"
        />
        <path
          fill="currentColor"
          d="m346.06,69.41c.22-.42.67-1.31,1.26-1.29.66.03.78,1.03.79,1.52.02,1.04-.09,2.09-.12,3.14-.06,2.36-.06,4.73.03,7.1.04,1.11.1,2.22.17,3.33.3,4.41.88,8.8,1.8,13.12s2.21,8.74,3.83,12.94c.26.69.56,1.36.83,2.04.23.59.63,1.31.59,1.96,0,.11-.03.23-.12.3-.09.07-.21.07-.32.06-.59-.06-1.11-.34-1.63-.61-13.82-7.34-14.77-29.1-7.12-43.6"
        />
      </g>
      <path
        fill="currentColor"
        d="m307.57,84.38c-1.49.6-3.88.99-5.57.99-3.28,0-5.37-1.79-5.37-6.76v-27.33h10.93v-6.36h-10.93v-15.01h-5.66c-2.09,8.75-6.76,14.41-15.11,17.49v3.88h5.47v27.33c0,10.34,5.86,13.52,15.3,13.52,3.68,0,8.15-.79,10.93-1.69v-6.06Zm-32.89,6.36v-4.17c-4.47-.5-5.57-1.39-5.57-4.37v-23.25c0-12.92-8.35-15.5-15.7-15.5-5.07,0-10.93,2.29-14.91,4.87v-4.87h-5.57s-1.46,2.32-7.08,5.12c-5.61,2.8-8.13,3.22-8.13,3.22v3.88h3.08c1.79,0,2.48.89,2.48,2.98v23.55c0,2.98-1.09,3.88-5.57,4.37v4.17h26.34v-4.17c-4.57-.5-5.56-1.39-5.56-4.37v-27.33c2.78-1.89,5.66-2.98,8.94-2.98,3.68,0,6.46,1.89,6.46,6.66v23.65c0,2.98-.99,3.88-5.57,4.37v4.17h26.34Zm-92.92-31.9c.89-6.26,3.28-9.44,8.75-9.44,4.47,0,7.45,3.58,7.45,9.44h-16.2Zm30.61,6.36c0-13.42-7.85-21.76-22.16-21.76s-24.55,10.24-24.55,24.35,9.74,24.45,26.14,24.45c11.43,0,17.69-5.86,21.96-14.61l-5.47-3.08c-3.48,7.06-8.84,11.03-14.61,11.03-8.75,0-12.32-6.06-12.32-17.79,0-.8,0-1.69.1-2.58h30.91Zm-61.81,34.09c0,2.48-3.88,5.37-12.72,5.37-9.54,0-13.62-2.98-13.62-6.26,0-1.69,1.29-3.18,3.48-3.98,3.28.6,7.25.89,11.73,1.09,8.94.3,11.13.8,11.13,3.78m-13.42-27.93c-4.97,0-7.06-3.68-7.06-11.03s2.09-11.03,7.06-11.03,6.96,3.78,6.96,11.03-2.09,11.03-6.96,11.03m18.68-25.34c2.58,0,2.48,2.48,5.96,2.48,2.98,0,5.17-2.38,5.17-5.37,0-3.88-3.18-5.66-6.76-5.66-5.37,0-10.24,3.18-13.52,7.45-2.78-.99-5.96-1.49-9.54-1.49-13.12,0-21.07,7.06-21.07,16.89,0,5.17,2.19,9.54,6.16,12.52-4.37,1.19-7.55,4.57-7.55,9.94,0,4.47,1.79,7.35,5.07,9.24-3.08,1.39-5.17,3.58-5.17,7.16,0,8.65,12.12,11.33,23.25,11.33,14.21,0,25.34-5.07,25.34-15.3,0-8.55-5.57-13.02-19.68-13.52-13.81-.5-18.78-1.09-18.78-3.38,0-1.19.99-2.09,3.18-2.09s4.07.99,9.24.99c13.02,0,20.97-7.06,20.97-16.89,0-4.97-1.99-9.14-5.66-12.12.99-1.39,2.19-2.19,3.38-2.19m-45.61,44.72v-4.17c-4.57-.5-5.57-1.39-5.57-4.37v-38.76h-5.57s-1.97,1.9-6.41,4.77c-4.04,2.62-8.8,3.58-8.8,3.58v3.88h3.08c1.79,0,2.48.89,2.48,2.98v23.55c0,2.98-1.09,3.88-5.57,4.37v4.17h26.34Zm-12.82-70.06c-5.76,0-8.84,4.17-8.84,8.35s3.08,8.15,8.84,8.15,8.84-4.07,8.84-8.15-3.28-8.35-8.84-8.35m-17.29,70.06v-4.17c-4.57-.5-5.57-1.39-5.57-4.37V19.68h-5.57s-3.24,3.11-6.97,5c-3.74,1.88-8.23,3.35-8.23,3.35v3.88h3.08c1.79,0,2.48.89,2.48,2.98v47.3c0,2.98-1.09,3.88-5.57,4.37v4.17h26.34Zm-50.98-10.73c-2.39,1.69-4.97,2.88-7.95,2.88s-5.47-1.69-5.47-5.37c0-5.47,5.37-7.85,13.42-9.44v11.93Zm.3,5.76c1.09,4.67,5.17,6.16,10.34,6.16,4.47,0,7.45-.8,10.24-2.48v-5.07c-1.19.6-2.19.7-2.88.7-1.69,0-2.68-1.09-2.68-3.78v-22.96c0-11.13-8.84-14.91-18.98-14.91-13.02,0-22.36,4.97-22.36,12.32,0,4.17,2.38,6.16,5.66,6.16,3.58,0,6.36-1.79,7.75-5.96,1.49-4.67,3.58-6.66,7.35-6.66,4.37,0,5.27,2.19,5.27,8.35v4.67c-14.21,2.58-29.12,6.56-29.12,18.39,0,6.76,5.27,11.33,13.42,11.33,6.16,0,11.83-3.08,16-6.26"
      />
    </svg>
  );
}

export function SoundYXZLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 1238.1 410" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="m205,410c113.22,0,205-91.78,205-205S318.22,0,205,0,0,91.78,0,205s91.78,205,205,205Zm115.61-234.81c0,2.55-2.09,4.64-4.64,4.64h-37.1c-2.55,0-4.64-2.09-4.64-4.64v-13.91c0-2.55-2.09-4.64-4.64-4.64h-48.7c-2.55,0-4.64-2.09-4.64-4.64v-20.87c0-2.55-2.09-4.64-4.64-4.64h-48.7c-2.55,0-4.64,2.09-4.64,4.64v48.7c0,2.55,2.09,4.64,4.64,4.64h83.48c2.55,0,4.64,2.09,4.64,4.64v13.91c0,2.55,2.09,4.64,4.64,4.64h60.29c2.55,0,4.64,2.09,4.64,4.64v76.52c0,2.55-2.09,4.64-4.64,4.64h-18.55c-2.55,0-4.64,2.09-4.64,4.64v18.55c0,2.55-2.09,4.64-4.64,4.64H121.18c-2.55,0-4.64-2.09-4.64-4.64v-18.55c0-2.55-2.09-4.64-4.64-4.64h-18.55c-2.55,0-4.64-2.09-4.64-4.64v-53.33c0-2.55,2.09-4.64,4.64-4.64h37.1c2.55,0,4.64,2.09,4.64,4.64v13.91c0,2.55,2.09,4.64,4.64,4.64h48.7c2.55,0,4.64,2.09,4.64,4.64v20.87c0,2.55,2.09,4.64,4.64,4.64h48.7c2.55,0,4.64-2.09,4.64-4.64v-48.7c0-2.55-2.09-4.64-4.64-4.64h-83.48c-2.55,0-4.64-2.09-4.64-4.64v-13.91c0-2.55-2.09-4.64-4.64-4.64h-60.29c-2.55,0-4.64-2.09-4.64-4.64v-76.52c0-2.55,2.09-4.64,4.64-4.64h18.55c2.55,0,4.64-2.09,4.64-4.64v-18.55c0-2.55,2.09-4.64,4.64-4.64h166.96c2.55,0,4.64,2.09,4.64,4.64v18.55c0,2.55,2.09,4.64,4.64,4.64h18.55c2.55,0,4.64,2.09,4.64,4.64v53.33Z"
      />
      <path
        fill="currentColor"
        d="m470,220.58l20.97.07c.45,11.1,7.53,15.95,18.01,15.98,10.97.04,16.96-5.09,16.98-12.97.02-6.92-4.32-11.11-15.28-11.15l-9.68-.03c-18.55-.07-29.32-10.24-29.27-25.19.06-16.89,13.81-28.58,37.04-28.5,23.87.08,36.89,12.67,37.47,31.49l-20.8-.07c-.45-9.97-5.91-15.3-16.72-15.34-9.68-.04-15.66,4.45-15.68,11.69-.02,6.59,4.97,9.83,13.19,9.86l10.64.04c21.29.07,30.92,12.01,30.88,26.48-.06,17.53-13.98,29.86-38.65,29.78-24.84-.09-38.5-12.68-39.08-32.14h-.01Z"
      />
      <path
        fill="currentColor"
        d="m556.47,205.92c.11-30.23,20.16-46.89,45.16-46.8s44.94,16.88,44.83,47.12c-.11,30.24-20.16,46.89-45.16,46.81-25-.09-44.94-16.88-44.83-47.12Zm44.89,31.04c14.03.05,23.26-10.37,23.34-30.8.07-20.43-9.09-30.91-23.12-30.96-14.03-.05-23.26,10.37-23.33,30.8-.07,20.43,9.08,30.91,23.12,30.96h0Z"
      />
      <path
        fill="currentColor"
        d="m656.9,217.53l.2-55.49,20.32.07-.19,53.07c-.05,15.76,6.7,21.9,16.7,21.93,10.32.03,20.02-6.53,20.08-24.22l.18-50.66,20.32.07-.31,88.46-20-.07.05-13.51h-.32c-5.36,10.92-15.06,16.19-26.83,16.15-18.39-.07-30.28-12.33-30.2-35.81h0Z"
      />
      <path
        fill="currentColor"
        d="m747.9,162.36l20,.07-.05,13.51h.32c5.36-10.43,15.06-16.19,27.32-16.15,18.06.06,29.95,12.33,29.87,35.81l-.19,55.49-20.32-.07.19-53.07c.05-15.44-6.7-21.9-16.7-21.93-10.16-.04-20.18,6.53-20.25,24.21l-.17,50.66-20.32-.07.31-88.46h-.01Z"
      />
      <path
        fill="currentColor"
        d="m839.19,206.91c.11-30.72,19.04-46.89,39.68-46.82,13.55.05,24.33,7,29.61,18.28h.33c-.31-3.05-.3-5.79-.29-9.01l.15-43.58,20.32.07-.44,125.61-20.16-.07.02-5.95c.01-3.22.02-6.11.2-9.49h-.33c-5.36,11.24-16.19,18.11-29.74,18.07-20.64-.07-39.46-16.38-39.35-47.1h0Zm45.53,31.04c14.84.05,23.76-12.14,23.82-30.8.07-18.66-8.76-30.91-23.6-30.96-14.99-.05-23.91,12.14-23.98,30.79-.06,18.66,8.77,30.91,23.77,30.96h-.01Z"
      />
      <path fill="currentColor" d="m942.49,229.95l21.77.08-.07,21.55-21.77-.08.07-21.55Z" />
      <path
        fill="currentColor"
        d="m1007.89,206.7l-31.78-43.53,25.16.09,18.93,28.69h.32l19.3-28.56,25.16.09-32.09,43.31,33.23,45.15-25.16-.09-20.54-30.15h-.32l-20.75,30-25.16-.09,33.7-44.91h0Z"
      />
      <path
        fill="currentColor"
        d="m1069.29,267.54l25.16.09,8.78-20.39-33.57-83.75,22.09.08,22.05,58.94h.33l22.62-58.78,21.77.08-46.36,113.71c-1.79,4.5-5.19,6.74-10.03,6.72l-32.9-.11.06-16.57h0Z"
      />
      <path
        fill="currentColor"
        d="m1161.81,237.31l45.84-56.93v-.32l-42.42-.15.06-16.08,69.51.24-.05,14.64-45.68,56.93v.32l49.03.17-.06,16.4-76.29-.27.06-14.96h0Z"
      />
    </svg>
  );
}

export function KarrotLogo(props: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 97 28" {...props}>
      <g clipPath="url(#logo_svg__a)">
        <g clipPath="url(#logo_svg__b)">
          <path
            fill="currentColor"
            d="M7.946 8.732a7.944 7.944 0 0 0-7.923 8.49l.008.105a7.9 7.9 0 0 0 .935 3.143c1.728 3.29 5.29 5.298 6.537 5.925.281.14.608.14.887 0 1.248-.627 4.81-2.635 6.537-5.924a7.897 7.897 0 0 0 .936-3.147l.007-.099a7.943 7.943 0 0 0-7.923-8.493Zm0 10.902a2.98 2.98 0 1 1 0-5.958 2.98 2.98 0 0 1 0 5.958Z"
          />
          <path
            fill="currentColor"
            d="M4.968 7.954h.64a7.95 7.95 0 0 1 4.678 0h.64a1.49 1.49 0 1 0-.836-2.72 2.483 2.483 0 1 0-4.624-1.25c0 .456.125.882.34 1.25a1.49 1.49 0 1 0-.837 2.72h-.001Z"
          />
        </g>
        <path
          fill="currentColor"
          d="M37.106 9.073H32.3L28.12 14.74V4.464h-4.229v18.783h4.229V18.06l3.99 5.187h5.236l-5.666-7.112 5.426-7.062Z"
        />
        <path
          fill="currentColor"
          d="M46.663 9.94c-.43-.289-.909-.479-1.487-.669-.719-.24-1.487-.338-2.304-.338-.959 0-1.925.19-2.784.578a7.414 7.414 0 0 0-2.255 1.536 8.15 8.15 0 0 0-1.536 2.305 7.276 7.276 0 0 0-.578 2.882c0 1.008.19 1.966.578 2.883a7.415 7.415 0 0 0 1.536 2.255 7.469 7.469 0 0 0 2.255 1.536 6.667 6.667 0 0 0 2.784.578c.817 0 1.585-.099 2.304-.339a5.282 5.282 0 0 0 1.487-.669v.818h4.18V9.073h-4.18v.867Zm-4.8 9.458c-.387-.19-.767-.43-1.056-.719-.29-.339-.529-.669-.719-1.107-.19-.43-.24-.867-.24-1.346 0-.48.1-.909.24-1.346.19-.43.43-.818.719-1.107.289-.29.669-.578 1.057-.719.388-.19.867-.289 1.346-.289.48 0 .958.1 1.346.29.43.19.818.429 1.107.718.339.289.579.669.768 1.107.19.43.29.867.29 1.346 0 .479-.1.958-.24 1.346-.19.43-.43.768-.719 1.107-.338.339-.669.578-1.106.719-.917.338-1.974.388-2.792 0ZM58.053 9.461c-.48.29-.958.628-1.346 1.058V9.08h-4.18v14.166h4.229v-6.484c0-1.107.29-2.015.867-2.693.579-.627 1.537-.958 2.833-.958h.24V8.883h-.24c-.867 0-1.685.19-2.403.578ZM67.75 9.461c-.48.29-.959.628-1.347 1.058V9.08h-4.18v14.166h4.23v-6.484c0-1.107.289-2.015.867-2.693.578-.627 1.536-.958 2.833-.958h.24V8.883h-.24c-.867 0-1.685.19-2.404.578ZM83.748 10.948c-.669-.669-1.486-1.198-2.403-1.586-.917-.388-1.925-.578-3.023-.578-1.107 0-2.115.19-3.023.578-.917.388-1.727.909-2.404 1.586a7.301 7.301 0 0 0-1.586 2.354 7.276 7.276 0 0 0-.578 2.883c0 1.007.19 2.015.578 2.882a7.256 7.256 0 0 0 1.586 2.354 6.664 6.664 0 0 0 2.404 1.537c.908.388 1.924.578 3.023.578 1.057 0 2.114-.19 3.023-.579.908-.388 1.726-.908 2.403-1.585a7.299 7.299 0 0 0 1.586-2.354 7.276 7.276 0 0 0 .578-2.883c0-1.008-.19-2.015-.578-2.883a6.21 6.21 0 0 0-1.586-2.304Zm-6.773 1.966c.43-.19.868-.24 1.347-.24s.958.1 1.346.24c.43.19.768.43 1.107.718.289.339.528.67.718 1.107.19.43.24.909.24 1.437 0 .529-.1 1.008-.29 1.438-.19.429-.429.817-.767 1.106a3.42 3.42 0 0 1-1.107.768c-.867.389-1.925.389-2.734 0-.43-.19-.768-.43-1.057-.768-.29-.338-.529-.669-.719-1.107-.14-.429-.24-.908-.24-1.437 0-.528.1-1.007.24-1.437.19-.43.43-.818.719-1.107.38-.33.76-.57 1.197-.718ZM95.948 12.864v-3.79h-3.362V5.521h-4.18v3.502h-1.965v3.8h1.966v5.475c0 1.636.43 2.833 1.346 3.7.867.818 2.304 1.248 4.18 1.248h2.064v-3.651h-1.776c-.578 0-.958-.1-1.197-.339-.24-.19-.388-.578-.388-1.156v-5.286h3.312v.05Z"
        />
      </g>
      <defs>
        <clipPath id="logo_svg__a">
          <path fill="none" d="M.003.5h96v27h-96z" />
        </clipPath>
        <clipPath id="logo_svg__b">
          <path fill="none" d="M.003 1.5H15.89v25H.003z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function NacelleLogo(props: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 357 91" fill="currentColor" {...props}>
      <defs>
        <clipPath id="a">
          <path fill="none" d="M0 0H91V91H0z" />
        </clipPath>
      </defs>
      <path d="M124 43v23h-9.3V26.7h8.8v6.7h.5c.9-2.2 2.3-3.9 4.3-5.2 2-1.3 4.5-1.9 7.4-1.9s5.1.6 7.1 1.7c2 1.2 3.6 2.8 4.7 5s1.7 4.9 1.7 8v25h-9.3V42.4c0-2.6-.7-4.7-2-6.2s-3.2-2.2-5.6-2.2-3.1.4-4.3 1.1c-1.2.7-2.2 1.7-2.9 3-.7 1.3-1 2.9-1 4.8zM169.9 66.8c-2.5 0-4.7-.4-6.7-1.3s-3.5-2.2-4.7-4c-1.1-1.8-1.7-3.9-1.7-6.5s.4-4 1.2-5.5c.8-1.4 1.9-2.6 3.3-3.5 1.4-.9 3-1.5 4.8-2 1.8-.5 3.6-.8 5.5-1 2.3-.2 4.2-.5 5.6-.6 1.4-.2 2.5-.5 3.1-.9.7-.4 1-1.1 1-2v-.2c0-1.9-.6-3.4-1.7-4.5s-2.8-1.6-4.9-1.6-4.1.5-5.4 1.5c-1.3 1-2.2 2.2-2.7 3.5L158 37c.7-2.4 1.8-4.4 3.4-6 1.6-1.6 3.5-2.8 5.8-3.6 2.3-.8 4.8-1.2 7.5-1.2s3.8.2 5.7.7c1.9.4 3.6 1.2 5.1 2.2 1.6 1 2.8 2.4 3.7 4.1 1 1.7 1.4 3.9 1.4 6.5V66h-8.9v-5.4h-.3c-.6 1.1-1.4 2.1-2.4 3.1-1 .9-2.3 1.7-3.8 2.3-1.5.6-3.3.8-5.3.8zm2.4-6.8c1.9 0 3.5-.4 4.8-1.1 1.4-.8 2.4-1.7 3.1-3 .8-1.2 1.1-2.6 1.1-4v-4.6c-.3.2-.8.5-1.5.7-.7.2-1.4.4-2.3.5-.9.2-1.7.3-2.5.4-.8.1-1.6.2-2.2.3-1.4.2-2.6.5-3.7.9s-2 1-2.6 1.8c-.6.8-.9 1.7-.9 2.9 0 1.7.6 3 1.9 3.9 1.2.9 2.8 1.3 4.8 1.3zM217.1 66.8c-3.9 0-7.3-.9-10.1-2.6-2.8-1.7-5-4.1-6.5-7.1-1.5-3.1-2.2-6.6-2.2-10.5s.8-7.5 2.3-10.6c1.5-3.1 3.7-5.5 6.5-7.2 2.8-1.7 6.1-2.6 10-2.6s6 .6 8.5 1.8c2.5 1.2 4.4 2.8 5.9 4.9 1.5 2.1 2.3 4.6 2.5 7.4h-8.8c-.4-1.9-1.2-3.5-2.6-4.7-1.3-1.3-3.1-1.9-5.3-1.9s-3.6.5-5 1.5-2.5 2.5-3.3 4.3c-.8 1.9-1.2 4.2-1.2 6.8s.4 5 1.2 6.9c.8 1.9 1.9 3.4 3.3 4.4 1.4 1 3.1 1.5 5 1.5s2.6-.3 3.7-.8 2-1.3 2.7-2.3c.7-1 1.2-2.2 1.5-3.6h8.8c-.2 2.8-1 5.2-2.5 7.4-1.4 2.1-3.3 3.8-5.8 5-2.4 1.2-5.3 1.8-8.6 1.8zM258.9 66.8c-3.9 0-7.3-.8-10.2-2.5-2.8-1.7-5-4-6.6-7-1.5-3-2.3-6.6-2.3-10.7s.8-7.6 2.3-10.6c1.6-3.1 3.7-5.5 6.5-7.2 2.8-1.7 6-2.6 9.8-2.6s4.7.4 6.9 1.2c2.2.8 4.1 2 5.7 3.6 1.7 1.6 3 3.7 3.9 6.2 1 2.5 1.4 5.5 1.4 8.9v2.8h-32.2v-6.2h23.3c0-1.8-.4-3.3-1.2-4.7-.8-1.4-1.8-2.5-3.1-3.3-1.3-.8-2.9-1.2-4.7-1.2s-3.6.5-5 1.4c-1.4.9-2.5 2.1-3.4 3.6-.8 1.5-1.2 3.1-1.2 4.8v5.4c0 2.3.4 4.2 1.3 5.9.8 1.6 2 2.9 3.5 3.7 1.5.9 3.3 1.3 5.3 1.3s2.6-.2 3.7-.6c1.1-.4 2-1 2.8-1.7s1.4-1.7 1.8-2.8l8.6 1c-.5 2.3-1.6 4.3-3.1 6-1.5 1.7-3.5 3-5.8 3.9-2.4.9-5.1 1.4-8.1 1.4zM293.5 13.6V66h-9.3V13.6h9.3zM312.2 13.6V66h-9.3V13.6h9.3zM339.1 66.8c-3.9 0-7.3-.8-10.2-2.5-2.8-1.7-5-4-6.6-7-1.5-3-2.3-6.6-2.3-10.7s.8-7.6 2.3-10.6c1.6-3.1 3.7-5.5 6.5-7.2 2.8-1.7 6-2.6 9.8-2.6s4.7.4 6.9 1.2c2.2.8 4.1 2 5.7 3.6 1.7 1.6 3 3.7 3.9 6.2 1 2.5 1.4 5.5 1.4 8.9v2.8h-32.2v-6.2h23.3c0-1.8-.4-3.3-1.2-4.7-.8-1.4-1.8-2.5-3.1-3.3-1.3-.8-2.9-1.2-4.7-1.2s-3.6.5-5 1.4c-1.4.9-2.5 2.1-3.3 3.6-.8 1.5-1.2 3.1-1.2 4.8v5.4c0 2.3.4 4.2 1.3 5.9.8 1.6 2 2.9 3.5 3.7 1.5.9 3.3 1.3 5.3 1.3s2.6-.2 3.7-.6c1.1-.4 2-1 2.8-1.7s1.4-1.7 1.8-2.8l8.6 1c-.5 2.3-1.6 4.3-3.1 6-1.5 1.7-3.5 3-5.8 3.9-2.4.9-5.1 1.4-8.1 1.4z" />
      <g clipPath="url(#a)">
        <path d="M20.2 7.7C9.2 15 1.5 27.1.1 40.9l13.4-7.7c3.2-8.5 9.7-15.3 17.8-19.2L20.1 7.6zM18.9 67.1c-4.7-5.9-7.6-13.4-7.6-21.6s0-2.5.2-3.7L0 48.4c.9 14 8.1 26.3 18.9 34V67.1zM51.6 79.7c-1.8.3-3.7.5-5.6.5-7.8 0-14.9-2.5-20.7-6.8v13c6.1 3 12.9 4.7 20.2 4.7s13-1.4 18.7-4l-12.6-7.3zM78.8 57c-3.2 9-10 16.3-18.7 20.2l10.7 6.2C81.8 76 89.5 64 90.9 50.1l-12.1 7zM91 42.6c-.9-14-8.1-26.3-18.9-34v14.1c5.3 6.1 8.6 14.1 8.6 22.8s0 2-.1 3l10.4-6zM45.5 0c-6.7 0-13 1.4-18.7 4l12.9 7.4c2.1-.4 4.2-.6 6.3-.6 7.3 0 14.1 2.3 19.7 6.1V4.7C59.6 1.7 52.8 0 45.5 0z" />
      </g>
    </svg>
  );
}

export function WealthsimpleLogo(props: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 172 26" {...props}>
      <path
        fill-rule="evenodd"
        d="M24.98 2.13v.25a2.7 2.7 0 0 1 1.66 1.14c.38.57.57 1.36.57 2.38 0 1.07-.17 2.15-.5 3.25a22.9 22.9 0 0 1-1.43 3.53l-.68 1.5-3.34-8.1a7.87 7.87 0 0 1-.55-2.13c0-.88.48-1.4 1.46-1.57v-.25H12.2v.25c.38.07.71.19.99.34.27.16.54.43.79.82.24.39.52.96.83 1.71l1.6 3.73-2.82 5.62-4.2-9.76a2.56 2.56 0 0 1-.26-.6 1.88 1.88 0 0 1-.07-.49c0-.29.1-.56.3-.8.2-.24.5-.43.88-.58v-.25H.08v.25c.8.24 1.53.7 2.17 1.36.65.66 1.28 1.68 1.9 3.04L10.6 21.2h.28l5.81-11.6 4.98 11.59h.28l5.92-12.82a21.17 21.17 0 0 1 2.38-4.13 6.25 6.25 0 0 1 2.28-1.88v-.25h-7.55v.01Z"
        clip-rule="evenodd"
      />
      <path d="M41.26 15.09c-.65 1.64-2.07 2.46-4.27 2.46a4.2 4.2 0 0 1-3.24-1.28c-.76-.82-1.16-2.05-1.2-3.67h8.9v-.17c0-1.14-.3-2.14-.88-2.99a6 6 0 0 0-2.36-2c-1-.47-2.1-.71-3.34-.71a7.4 7.4 0 0 0-3.64.91 6.98 6.98 0 0 0-3.65 6.34c0 1.35.3 2.55.9 3.59A6.47 6.47 0 0 0 31 20.02c1.07.6 2.3.88 3.67.88 1.84 0 3.34-.47 4.52-1.43a7.26 7.26 0 0 0 2.37-4.3l-.3-.08Zm-8.13-6.65c.39-.88.95-1.33 1.7-1.33a1.4 1.4 0 0 1 1.24.7c.13.2.24.44.34.7.09.27.16.63.2 1.08.05.46.07 1.06.07 1.82v.69h-4.12c0-.84.05-1.54.14-2.1.1-.63.25-1.15.43-1.56Zm23.94 10.25a.6.6 0 0 1-.32.15l-.31.02a.73.73 0 0 1-.7-.4c-.14-.27-.21-.8-.21-1.6v-6.48c0-1.3-.28-2.23-.83-2.82-.55-.6-1.43-.89-2.64-.89a16.25 16.25 0 0 0-6.75 1.6 7.62 7.62 0 0 0-2.33 1.59 2.67 2.67 0 0 0-.79 1.82c0 .58.2 1.03.58 1.37.39.35.9.52 1.52.52a2.5 2.5 0 0 0 1.81-.8 3 3 0 0 0 .8-2.22v-.47c0-.85.2-1.49.57-1.93.37-.43.84-.65 1.39-.65.44 0 .8.11 1.09.32.28.21.5.58.63 1.1.14.51.2 1.23.2 2.16v1.41c-1.39.43-2.62.84-3.7 1.26-1.22.47-2.24.93-3.04 1.4-1.27.71-1.9 1.64-1.9 2.76 0 .89.35 1.6 1.06 2.13.7.54 1.63.8 2.77.8a6.4 6.4 0 0 0 2.93-.64c.7-.35 1.35-.9 1.95-1.67.14.78.4 1.34.8 1.7a2.6 2.6 0 0 0 1.83.64 4.3 4.3 0 0 0 2.1-.52 5.01 5.01 0 0 0 1.65-1.47l-.16-.19Zm-7.88.25c-1.05 0-1.57-.72-1.57-2.16 0-.96.29-1.75.86-2.37.48-.53 1.26-1 2.31-1.42v4c0 .62-.15 1.1-.44 1.43-.3.35-.68.52-1.16.52Z" />
      <path
        fill-rule="evenodd"
        d="M57.07 20.18c.53-.04.92-.24 1.17-.62.25-.38.37-1.14.37-2.29V5.95c0-1.3-.17-2.22-.52-2.76a1.67 1.67 0 0 0-1.49-.82v-.3A66.02 66.02 0 0 0 63.35.19v17.64c0 .9.1 1.5.29 1.82.2.32.53.5 1 .53v.3h-7.57v-.3Zm9.97-.05c-.55-.52-.83-1.4-.83-2.63V8.22h-2.04L64.12 8c.72-.33 1.48-.81 2.3-1.44a22.02 22.02 0 0 0 4.42-4.54l.25.09v4.95h3.08l-.66 1.17H71.1v8.41c0 .82.12 1.4.36 1.75.24.35.59.53 1.05.53.22 0 .44-.03.67-.09.23-.05.44-.15.62-.28l.16.23c-.8.68-1.57 1.2-2.28 1.57-.72.37-1.47.56-2.26.56a3.37 3.37 0 0 1-2.37-.78Z"
        clip-rule="evenodd"
      />
      <path
        fill-rule="evenodd"
        d="M88.76 19.6a5.28 5.28 0 0 1-.26-2.05V10.5c0-2.54-1.03-3.82-3.08-3.82-.6 0-1.13.07-1.62.22a6.2 6.2 0 0 0-1.6.8c-.54.37-1.2.88-2 1.53V.2a67.7 67.7 0 0 1-6.74 1.88v.3c.64 0 1.14.28 1.49.82.35.55.52 1.47.52 2.76V17c0 1.23-.13 2.06-.4 2.49-.26.43-.68.65-1.25.7v.3h7.66v-.3c-.46-.05-.79-.24-.98-.59a4.85 4.85 0 0 1-.29-2.05V9.71c.41-.34.78-.6 1.1-.74.37-.17.7-.25 1-.25.47 0 .84.2 1.11.6.27.4.4 1.08.4 2.06v6.14c0 .72-.04 1.27-.11 1.64-.07.36-.2.62-.37.76-.18.13-.44.22-.79.26v.3h7.16v-.3c-.46-.03-.77-.23-.95-.58Zm6.08 1.1-1.8-.35a7.49 7.49 0 0 0-1.43-.17 2.46 2.46 0 0 0-1.16.28v-6.2l.28-.06a29.62 29.62 0 0 0 2.64 3.64c.8.9 1.53 1.54 2.2 1.91.69.38 1.36.57 2.02.57.64 0 1.11-.14 1.4-.43.3-.29.44-.67.44-1.15 0-.59-.2-1.06-.59-1.4a7.4 7.4 0 0 0-2.1-1.14l-1.96-.78a9.85 9.85 0 0 1-3.3-1.91 3.3 3.3 0 0 1-.94-2.4c0-.84.21-1.58.65-2.25a4.5 4.5 0 0 1 1.86-1.59c.8-.4 1.77-.6 2.89-.6.59 0 1.17.05 1.75.14.58.1 1.1.18 1.56.27.46.08.8.12 1.04.12a1.63 1.63 0 0 0 .75-.14l.38 5.07-.25.06a16.96 16.96 0 0 0-3.03-3.8A4.16 4.16 0 0 0 95.5 7.2c-.55 0-1 .14-1.35.42-.35.3-.52.68-.52 1.18 0 .54.17.98.53 1.33.36.35.96.67 1.8.94l2.32.78a7.99 7.99 0 0 1 3.13 1.67c.63.64.95 1.45.95 2.42a4.5 4.5 0 0 1-1.53 3.6 5.98 5.98 0 0 1-4.06 1.33 11.3 11.3 0 0 1-1.93-.18Zm11.34-14.89a2.85 2.85 0 0 0 2.87-2.88c0-.75-.26-1.42-.79-1.99a2.69 2.69 0 0 0-2.08-.86c-.5 0-.96.14-1.39.4-.43.27-.78.62-1.05 1.06a2.77 2.77 0 0 0 .45 3.43c.58.56 1.24.84 2 .84Z"
        clip-rule="evenodd"
      />
      <path
        fill-rule="evenodd"
        d="M133.69 19.66c-.2-.32-.29-.92-.29-1.83V10.5c0-2.54-1.03-3.82-3.08-3.82-.57 0-1.13.09-1.67.27-.54.17-1.1.45-1.7.84-.52.34-1.1.79-1.76 1.33a2.6 2.6 0 0 0-.85-1.65 3.25 3.25 0 0 0-2.26-.79c-.9 0-1.79.21-2.67.64-.8.38-1.59.96-2.4 1.73V6.67a55.75 55.75 0 0 1-4.43 1.5l-1.95.55V9c.6.05 1.03.3 1.28.74s.37 1.3.37 2.58v5.5c0 .9-.16 1.5-.5 1.85-.33.34-.73.51-1.21.51-.57 0-1-.17-1.28-.51-.29-.34-.43-.96-.43-1.84V6.6c-1.02.41-2.1.78-3.25 1.13-1.14.34-2.3.66-3.5.95v.28c.74.05 1.26.35 1.57.9.32.54.47 1.45.47 2.7V17c0 1.18-.13 2-.39 2.45-.25.45-.67.7-1.26.73v.3h15.78v-.3a1.22 1.22 0 0 1-.96-.6 3.8 3.8 0 0 1-.3-1.78V9.6c.33-.28.63-.5.9-.62a2.5 2.5 0 0 1 1.03-.23c.53 0 .93.18 1.19.56.25.38.38 1.07.38 2.07v6.42c0 .9-.1 1.51-.29 1.82-.19.32-.5.5-.95.56v.3h7.22v-.3c-.48-.06-.81-.23-1-.53-.18-.3-.27-.91-.27-1.85V9.6c.35-.3.66-.53.94-.7a2 2 0 0 1 1.05-.32c.47 0 .85.2 1.11.62.27.42.4 1.14.4 2.18v6.42c0 .96-.08 1.58-.25 1.87-.16.29-.5.45-1.01.51v.3h7.3v-.3c-.53-.03-.89-.2-1.08-.52Z"
        clip-rule="evenodd"
      />
      <path d="M149.53 10.58a5.25 5.25 0 0 0-1-2.14 4.51 4.51 0 0 0-3.64-1.8 5.3 5.3 0 0 0-2.19.46c-.59.27-1.21.67-1.86 1.2V6.65a79.25 79.25 0 0 1-6.72 2.07v.25c.51.05.91.18 1.2.39.28.2.49.53.62 1 .13.46.19 1.1.19 1.93v9.36c0 1-.09 1.76-.25 2.3-.16.53-.41.9-.74 1.12a2.8 2.8 0 0 1-1.24.4v.3h9v-.3c-.77-.07-1.3-.3-1.6-.69-.31-.39-.46-1.12-.46-2.19v-2.54c.36.25.7.44 1.05.55a6.27 6.27 0 0 0 4.05-.26 5.7 5.7 0 0 0 2.01-1.43 7 7 0 0 0 1.4-2.38 9 9 0 0 0 .5-3.07c0-1.06-.1-2.02-.32-2.88Zm-5.47 8.03c-.51.94-1.15 1.4-1.9 1.4a1.9 1.9 0 0 1-.85-.17 2.6 2.6 0 0 1-.47-.32V8.86c.61-.48 1.14-.72 1.57-.72.7 0 1.27.47 1.73 1.4.46.93.7 2.4.7 4.39 0 2.17-.27 3.73-.78 4.68Z" />
      <path
        fill-rule="evenodd"
        d="M149.7 20.18c.54-.04.93-.24 1.18-.62.25-.38.37-1.14.37-2.29V5.95c0-1.3-.17-2.22-.52-2.76a1.67 1.67 0 0 0-1.49-.82v-.3a93.6 93.6 0 0 0 3.44-.87c1.18-.33 2.28-.66 3.3-1.01v17.64c0 .9.1 1.5.3 1.82.19.32.53.5 1 .53v.3h-7.57v-.3Z"
        clip-rule="evenodd"
      />
      <path d="M170.83 15.09c-.64 1.64-2.06 2.46-4.27 2.46a4.2 4.2 0 0 1-3.23-1.28c-.76-.82-1.16-2.05-1.2-3.67h8.9v-.17c0-1.14-.3-2.14-.88-2.99a6 6 0 0 0-2.37-2 7.67 7.67 0 0 0-3.33-.71c-1.32 0-2.54.3-3.65.91a6.98 6.98 0 0 0-3.65 6.34c0 1.35.3 2.55.91 3.59a6.47 6.47 0 0 0 2.51 2.45c1.07.6 2.29.88 3.67.88 1.83 0 3.34-.47 4.51-1.43a7.26 7.26 0 0 0 2.37-4.3l-.29-.08Zm-8.12-6.65c.38-.88.95-1.33 1.7-1.33.26 0 .5.06.7.17.22.11.4.29.54.53.13.2.24.44.33.7.1.27.17.63.21 1.08.05.46.07 1.06.07 1.82v.69h-4.13c.01-.84.06-1.54.15-2.1.1-.63.25-1.15.43-1.56Z" />
    </svg>
  );
}